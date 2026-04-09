import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { combineLatest, map, startWith, tap } from 'rxjs';

import { Politica } from '../../core/models/politica.model';
import { PoliticaService } from '../../core/services/politica.service';

export type SeveridadFiltro = 'todos' | 'critico' | 'alto' | 'medio' | 'rapido';

export type SeveridadNivel = 'rapido' | 'medio' | 'alto' | 'critico';

export type NodoCuelloRow = {
  actividad: string;
  responsable: string;
  tiempoPromedioDias: number;
  severidad: SeveridadNivel;
};

type PoliticaAnalisisMock = {
  tramitesAnalizados: number;
  nodos: NodoCuelloRow[];
};

function severidadDesdeDias(d: number): SeveridadNivel {
  if (d < 1) return 'rapido';
  if (d <= 3) return 'medio';
  if (d <= 5) return 'alto';
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

/** Mock por política — mínimo 6 nodos, incluye crítico y rápido */
const MOCK_POR_POLITICA: Record<string, PoliticaAnalisisMock> = {
  'pol-1': {
    tramitesAnalizados: 28,
    nodos: [
      {
        actividad: 'Inicio',
        responsable: 'Sistema',
        tiempoPromedioDias: 0.4,
        severidad: severidadDesdeDias(0.4),
      },
      {
        actividad: 'Revisar solicitud',
        responsable: 'Recursos Humanos',
        tiempoPromedioDias: 2.2,
        severidad: severidadDesdeDias(2.2),
      },
      {
        actividad: '¿Cumple requisitos?',
        responsable: 'Recursos Humanos',
        tiempoPromedioDias: 1.6,
        severidad: severidadDesdeDias(1.6),
      },
      {
        actividad: 'Aprobar',
        responsable: 'Dirección',
        tiempoPromedioDias: 6.8,
        severidad: severidadDesdeDias(6.8),
      },
      {
        actividad: 'Rechazar',
        responsable: 'Dirección',
        tiempoPromedioDias: 4.2,
        severidad: severidadDesdeDias(4.2),
      },
      {
        actividad: 'Fin',
        responsable: 'Sistema',
        tiempoPromedioDias: 0.15,
        severidad: severidadDesdeDias(0.15),
      },
    ],
  },
  'pol-2': {
    tramitesAnalizados: 19,
    nodos: [
      {
        actividad: 'Inicio',
        responsable: 'Sistema',
        tiempoPromedioDias: 0.25,
        severidad: severidadDesdeDias(0.25),
      },
      {
        actividad: 'Capturar datos',
        responsable: 'Atención al Cliente',
        tiempoPromedioDias: 1.1,
        severidad: severidadDesdeDias(1.1),
      },
      {
        actividad: 'Validar identidad',
        responsable: 'Soporte Técnico',
        tiempoPromedioDias: 3.4,
        severidad: severidadDesdeDias(3.4),
      },
      {
        actividad: 'Verificación documental',
        responsable: 'Soporte Técnico',
        tiempoPromedioDias: 5.1,
        severidad: severidadDesdeDias(5.1),
      },
      {
        actividad: 'Resolución manual',
        responsable: 'Dirección',
        tiempoPromedioDias: 7.5,
        severidad: severidadDesdeDias(7.5),
      },
      {
        actividad: 'Fin',
        responsable: 'Sistema',
        tiempoPromedioDias: 0.08,
        severidad: severidadDesdeDias(0.08),
      },
    ],
  },
};

export type AnalisisVm = {
  politicasSelect: Politica[];
  politicaId: string;
  politicaNombre: string;
  tramitesAnalizados: number;
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
  ],
  templateUrl: './analisis.component.html',
  styleUrl: './analisis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalisisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly politicaService = inject(PoliticaService);

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
    map(([activas, selectedId, filtroSev]): AnalisisVm => {
      if (!activas.length) {
        return {
          politicasSelect: [],
          politicaId: '',
          politicaNombre: '',
          tramitesAnalizados: 0,
          tiempoPromedioTotal: 0,
          nodoCriticoNombre: '—',
          nodoCriticoDias: 0,
          hayCritico: false,
          alertaNodo: '',
          alertaTiempo: 0,
          maxDias: 1,
          barras: [],
          filasTabla: [],
          displayedColumns: ['actividad', 'responsable', 'tiempo', 'estado'],
        };
      }

      const id =
        selectedId && activas.some((p) => p.id === selectedId)
          ? selectedId
          : (activas[0]?.id ?? '');

      const mock: PoliticaAnalisisMock =
        id && MOCK_POR_POLITICA[id]
          ? MOCK_POR_POLITICA[id]
          : MOCK_POR_POLITICA['pol-1'];
      const nodos = mock.nodos;
      const tiempoPromedioTotal =
        nodos.reduce((a, n) => a + n.tiempoPromedioDias, 0) /
        Math.max(nodos.length, 1);
      const peor = [...nodos].sort(
        (a, b) => b.tiempoPromedioDias - a.tiempoPromedioDias,
      )[0];
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

      return {
        politicasSelect: activas,
        politicaId: id,
        politicaNombre: activas.find((p) => p.id === id)?.nombre ?? 'Política',
        tramitesAnalizados: mock.tramitesAnalizados,
        tiempoPromedioTotal,
        nodoCriticoNombre: peor?.actividad ?? '—',
        nodoCriticoDias: peor?.tiempoPromedioDias ?? 0,
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
        displayedColumns: ['actividad', 'responsable', 'tiempo', 'estado'],
      };
    }),
    tap((vm) => {
      if (
        vm.politicaId &&
        this.politicaCtrl.value !== vm.politicaId
      ) {
        this.politicaCtrl.setValue(vm.politicaId, { emitEvent: false });
      }
    }),
  );

  formatoDias(d: number): string {
    return d < 1 ? d.toFixed(2) : d.toFixed(1);
  }
}
