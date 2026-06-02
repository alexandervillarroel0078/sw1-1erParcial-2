import { AsyncPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { AnalisisPoliticaMetricas } from '../../core/models/analisis-metricas.model';
import { Politica } from '../../core/models/politica.model';
import { AnalisisService } from '../../core/services/analisis.service';
import { PoliticaService } from '../../core/services/politica.service';
import { PrediccionesIaComponent } from './predicciones-ia.component';

export type SeveridadFiltro = 'todos' | 'critico' | 'alto' | 'medio' | 'rapido';

export type SeveridadNivel = 'rapido' | 'medio' | 'alto' | 'critico';

export type NodoCuelloRow = {
  nodoId: string;
  actividad: string;
  responsable: string;
  tiempoPromedioDias: number;
  cantidadDemorados: number;
  severidad: SeveridadNivel;
};

function severidadDesdeApi(estado: string): SeveridadNivel {
  const u = (estado ?? '').toString().toUpperCase();
  if (u === 'RAPIDO') return 'rapido';
  if (u === 'MEDIO') return 'medio';
  if (u === 'ALTO') return 'alto';
  return 'critico';
}

function etiquetaSeveridad(s: SeveridadNivel): string {
  switch (s) {
    case 'rapido':
      return 'Rápido';
    case 'medio':
      return 'Medio';
    case 'alto':
      return 'Alto';
    case 'critico':
      return 'Crítico';
  }
}

export type AnalisisVm = {
  politicasSelect: Politica[];
  politicaId: string;
  politicaNombre: string;
  insuficiente: boolean;
  tramitesAnalizados: number;
  totalDemorados: number;
  tiempoPromedioTotal: number;
  nodoCriticoNombre: string;
  nodoCriticoDias: number;
  hayCritico: boolean;
  alertaNodo: string;
  alertaTiempo: number;
  maxDias: number;
  barras: Array<
    NodoCuelloRow & { pct: number; severidadLabel: string; barClass: string }
  >;
  filasTabla: Array<
    NodoCuelloRow & { severidadLabel: string; badgeClass: string }
  >;
  displayedColumns: string[];
};

@Component({
  selector: 'app-analisis',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTableModule,
    MatChipsModule,
    MatTabsModule,
    PrediccionesIaComponent,
  ],
  templateUrl: './analisis.component.html',
  styleUrl: './analisis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalisisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly politicaService = inject(PoliticaService);
  private readonly analisisService = inject(AnalisisService);

  readonly politicaCtrl = this.fb.nonNullable.control<string>('');
  readonly severidadFiltro = this.fb.nonNullable.control<SeveridadFiltro>('todos');

  private readonly politicasActivas$ = this.politicaService
    .getPoliticas()
    .pipe(map((list) => list.filter((p) => p.activa && p.id)));

  readonly vm$ = combineLatest([
    this.politicasActivas$,
    this.politicaCtrl.valueChanges.pipe(
      startWith(this.politicaCtrl.value),
    ),
    this.severidadFiltro.valueChanges.pipe(
      startWith(this.severidadFiltro.value),
    ),
  ]).pipe(
    switchMap(([activas, selectedId, filtroSev]) => {
      if (!activas.length) {
        return of(this.vmSinPoliticas());
      }
      const id = this.resolverPoliticaId(activas, selectedId);
      return this.analisisService.getMetricasPolitica(id).pipe(
        map((dto) => this.vmDesdeDto(activas, id, filtroSev, dto)),
        catchError(() =>
          of(this.vmDesdeDto(activas, id, filtroSev, this.dtoVacio(id))),
        ),
      );
    }),
    tap((vm) => {
      if (vm.politicaId && this.politicaCtrl.value !== vm.politicaId) {
        this.politicaCtrl.setValue(vm.politicaId, { emitEvent: false });
      }
    }),
  );

  private dtoVacio(politicaId: string): AnalisisPoliticaMetricas {
    return {
      politicaId,
      tramitesAnalizados: 0,
      totalDemorados: 0,
      tiempoPromedioTotal: 0,
      nodoCriticoId: null,
      nodoCriticoEtiqueta: '—',
      nodoCriticoPromedio: 0,
      detalleNodos: [],
    };
  }

  private resolverPoliticaId(activas: Politica[], selectedId: string): string {
    return selectedId && activas.some((p) => p.id === selectedId)
      ? selectedId
      : (activas[0]?.id ?? '');
  }

  private vmSinPoliticas(): AnalisisVm {
    return {
      politicasSelect: [],
      politicaId: '',
      politicaNombre: '',
      insuficiente: false,
      tramitesAnalizados: 0,
      totalDemorados: 0,
      tiempoPromedioTotal: 0,
      nodoCriticoNombre: '—',
      nodoCriticoDias: 0,
      hayCritico: false,
      alertaNodo: '',
      alertaTiempo: 0,
      maxDias: 1,
      barras: [],
      filasTabla: [],
      displayedColumns: [
        'actividad',
        'responsable',
        'tiempo',
        'demorados',
        'estado',
      ],
    };
  }

  private vmDesdeDto(
    activas: Politica[],
    id: string,
    filtroSev: SeveridadFiltro,
    dto: AnalisisPoliticaMetricas,
  ): AnalisisVm {
    const politicaNombre = activas.find((p) => p.id === id)?.nombre ?? 'Política';
    const detalle = dto.detalleNodos ?? [];
    const insuficiente = detalle.length === 0;

    if (insuficiente) {
      return {
        politicasSelect: activas,
        politicaId: id,
        politicaNombre,
        insuficiente: true,
        tramitesAnalizados: dto.tramitesAnalizados ?? 0,
        totalDemorados: dto.totalDemorados ?? 0,
        tiempoPromedioTotal: 0,
        nodoCriticoNombre: '—',
        nodoCriticoDias: 0,
        hayCritico: false,
        alertaNodo: '',
        alertaTiempo: 0,
        maxDias: 1,
        barras: [],
        filasTabla: [],
        displayedColumns: [
          'actividad',
          'responsable',
          'tiempo',
          'demorados',
          'estado',
        ],
      };
    }

    const nodos: NodoCuelloRow[] = detalle.map((n) => ({
      nodoId: n.nodoId,
      actividad: (n.etiqueta ?? n.nodoId).trim() || n.nodoId,
      responsable: (n.departamento ?? '—').trim() || '—',
      tiempoPromedioDias: n.tiempoPromedio,
      cantidadDemorados: n.cantidadDemorados ?? 0,
      severidad: severidadDesdeApi(String(n.estado)),
    }));

    const tiempoPromedioTotal = dto.tiempoPromedioTotal;
    const criticos = nodos.filter((n) => n.severidad === 'critico');
    const peorCritico =
      criticos.length > 0
        ? criticos.reduce((a, b) =>
            a.tiempoPromedioDias >= b.tiempoPromedioDias ? a : b,
          )
        : null;
    const hayCritico = criticos.length > 0;
    const maxDias = Math.max(...nodos.map((n) => n.tiempoPromedioDias), 0.01);

    const filasFiltradas = nodos.filter((n) => {
      if (filtroSev === 'todos') return true;
      return n.severidad === filtroSev;
    });

    const nodoCriticoNombre =
      (dto.nodoCriticoEtiqueta ?? '').trim() || nodos[0]?.actividad || '—';
    const nodoCriticoDias = dto.nodoCriticoPromedio ?? nodos[0]?.tiempoPromedioDias ?? 0;

    return {
      politicasSelect: activas,
      politicaId: id,
      politicaNombre,
      insuficiente: false,
      tramitesAnalizados: dto.tramitesAnalizados,
      totalDemorados: dto.totalDemorados ?? 0,
      tiempoPromedioTotal,
      nodoCriticoNombre,
      nodoCriticoDias,
      hayCritico,
      alertaNodo: peorCritico?.actividad ?? '',
      alertaTiempo: peorCritico?.tiempoPromedioDias ?? 0,
      maxDias,
      barras: nodos.map((n) => ({
        ...n,
        pct: Math.round((n.tiempoPromedioDias / maxDias) * 100),
        severidadLabel: etiquetaSeveridad(n.severidad),
        barClass: `bar--${n.severidad}`,
      })),
      filasTabla: filasFiltradas.map((n) => ({
        ...n,
        severidadLabel: etiquetaSeveridad(n.severidad),
        badgeClass: `badge--${n.severidad}`,
      })),
      displayedColumns: [
        'actividad',
        'responsable',
        'tiempo',
        'demorados',
        'estado',
      ],
    };
  }

  formatoMinutos(m: number): string {
    return m < 1 ? m.toFixed(2) : m.toFixed(1);
  }
}
