import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { combineLatest, interval, merge, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { Tramite } from '../../core/models/tramite.model';
import { TramiteService } from '../../core/services/tramite.service';

export type EstadoFiltro = 'todos' | Tramite['estado'];

export type MonitorCardVM = {
  tramiteId: string;
  politicaNombre: string;
  clienteNombre: string;
  estado: Tramite['estado'];
  estadoLabel: string;
  diasTranscurridos: number;
  progreso: number;
  actividadActual: string;
  stripeColor: string;
  badgeClass: string;
  progressColor: 'primary' | 'accent' | 'warn';
};

export type PoliticaOption = { id: string; nombre: string };

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    RouterLink,
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tramiteService = inject(TramiteService);

  private readonly clientesMock: Record<string, string> = {
    'cli-1': 'María López',
    'cli-2': 'Carlos Pérez',
  };

  readonly estadoFiltro = this.fb.nonNullable.control<EstadoFiltro>('todos');
  readonly politicaFiltro = this.fb.nonNullable.control<string>('todos');

  /** Refresco cada 30 s + carga inicial inmediata */
  private readonly refresh$ = merge(of(0), interval(30_000)).pipe(
    switchMap(() => this.tramiteService.getTramites()),
  );

  readonly vm$ = combineLatest([
    this.refresh$,
    this.estadoFiltro.valueChanges.pipe(
      startWith(this.estadoFiltro.value),
    ),
    this.politicaFiltro.valueChanges.pipe(
      startWith(this.politicaFiltro.value),
    ),
  ]).pipe(
    map(([tramites, estado, politicaId]) => {
      const politicas = this.politicasDesdeTramites(tramites);
      let list = [...tramites];
      if (estado !== 'todos') {
        list = list.filter((t) => t.estado === estado);
      }
      if (politicaId !== 'todos') {
        list = list.filter((t) => t.politicaId === politicaId);
      }
      list.sort(
        (a, b) =>
          +new Date(b.creadoEn ?? 0) - +new Date(a.creadoEn ?? 0),
      );
      return {
        politicas,
        rows: list.map((t) => this.toCardVm(t)),
      };
    }),
  );

  private politicasDesdeTramites(tramites: Tramite[]): PoliticaOption[] {
    const mapa = new Map<string, string>();
    for (const t of tramites) {
      if (t.politicaId) {
        mapa.set(t.politicaId, t.politicaNombre ?? t.politicaId);
      }
    }
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private toCardVm(t: Tramite): MonitorCardVM {
    const stripe = this.stripeForEstado(t.estado);
    return {
      tramiteId: t.id ?? '—',
      politicaNombre: t.politicaNombre ?? 'Política',
      clienteNombre:
        t.clienteNombre ??
        this.clientesMock[t.clienteId ?? ''] ??
        t.clienteId ??
        '—',
      estado: t.estado,
      estadoLabel: this.estadoLabel(t.estado),
      diasTranscurridos: this.diasDesde(t.creadoEn),
      progreso: this.progresoPct(t),
      actividadActual: t.actividadActual ?? '—',
      stripeColor: stripe.color,
      badgeClass: stripe.badgeClass,
      progressColor: stripe.progress,
    };
  }

  private estadoLabel(estado: Tramite['estado']): string {
    switch (estado) {
      case 'iniciado':
        return 'Iniciado';
      case 'en_proceso':
        return 'En proceso';
      case 'esperando_decision':
        return 'Esperando decisión';
      case 'demorado':
        return 'Demorado';
      case 'completado':
        return 'Completado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  private diasDesde(fecha?: Date): number {
    if (!fecha) return 0;
    const ms = Date.now() - new Date(fecha).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  }

  private progresoPct(t: Tramite): number {
    if (
      t.pasoActual != null &&
      t.totalPasos != null &&
      t.totalPasos > 0
    ) {
      return Math.min(
        100,
        Math.round((t.pasoActual / t.totalPasos) * 100),
      );
    }
    switch (t.estado) {
      case 'iniciado':
        return 20;
      case 'en_proceso':
        return 55;
      case 'esperando_decision':
        return 48;
      case 'demorado':
        return 70;
      case 'completado':
        return 100;
      case 'cancelado':
        return 0;
      default:
        return 0;
    }
  }

  private stripeForEstado(estado: Tramite['estado']): {
    color: string;
    badgeClass: string;
    progress: MonitorCardVM['progressColor'];
  } {
    switch (estado) {
      case 'demorado':
        return {
          color: '#E24B4A',
          badgeClass: 'badge--rojo',
          progress: 'warn',
        };
      case 'en_proceso':
        return {
          color: '#EF9F27',
          badgeClass: 'badge--amarillo',
          progress: 'accent',
        };
      case 'esperando_decision':
        return {
          color: '#00838f',
          badgeClass: 'badge--cian',
          progress: 'accent',
        };
      case 'completado':
        return {
          color: '#639922',
          badgeClass: 'badge--verde',
          progress: 'primary',
        };
      case 'iniciado':
        return {
          color: '#1976d2',
          badgeClass: 'badge--azul',
          progress: 'primary',
        };
      case 'cancelado':
        return {
          color: '#9e9e9e',
          badgeClass: 'badge--gris',
          progress: 'primary',
        };
      default:
        return {
          color: '#1976d2',
          badgeClass: 'badge--azul',
          progress: 'primary',
        };
    }
  }
}
