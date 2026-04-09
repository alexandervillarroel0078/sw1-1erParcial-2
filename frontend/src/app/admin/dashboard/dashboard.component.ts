import { AsyncPipe, NgClass, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { PoliticaService } from '../../core/services/politica.service';
import { TareaService } from '../../core/services/tarea.service';
import { TramiteService } from '../../core/services/tramite.service';
import { Tarea } from '../../core/models/tarea.model';
import { Tramite } from '../../core/models/tramite.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    TitleCasePipe,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly tramiteService = inject(TramiteService);
  private readonly tareaService = inject(TareaService);
  private readonly politicaService = inject(PoliticaService);

  private readonly clientesMock: Record<string, string> = {
    'cli-1': 'María López',
    'cli-2': 'Carlos Pérez',
  };

  readonly metrics$ = combineLatest([
    this.tramiteService.getTramites(),
    this.tareaService.getTareas(),
    this.politicaService.getPoliticas(),
  ]).pipe(
    map(([tramites, tareas, politicas]) => {
      const procesosActivos = tramites.filter(
        (t) => t.estado !== 'completado' && t.estado !== 'cancelado',
      ).length;

      const tareasPendientes = tareas.filter((t) => t.estado !== 'completado')
        .length;

      const politicasActivas = politicas.filter((p) => p.activa).length;

      const dias = tareas
        .map((t) => t.diasAbierto ?? 0)
        .filter((x) => Number.isFinite(x));
      const avgDias = dias.length
        ? dias.reduce((a, b) => a + b, 0) / dias.length
        : 0;

      return {
        procesosActivos,
        tareasPendientes,
        politicasActivas,
        tiempoPromedio: avgDias ? `${avgDias.toFixed(1)} días` : '—',
      };
    }),
  );

  readonly procesosRecientes$ = this.tramiteService.getTramites().pipe(
    map((tramites) =>
      [...tramites]
        .sort((a, b) => +new Date(b.creadoEn ?? 0) - +new Date(a.creadoEn ?? 0))
        .slice(0, 5)
        .map((t) => this.toProcesoRow(t)),
    ),
  );

  readonly cuellosBotella$ = this.tareaService.getTareas().pipe(
    map((tareas) => {
      const groups = new Map<string, number[]>();
      for (const t of tareas) {
        const key = t.actividadEtiqueta;
        const val = t.diasAbierto ?? 0;
        const arr = groups.get(key) ?? [];
        arr.push(val);
        groups.set(key, arr);
      }
      const rows = [...groups.entries()].map(([actividad, vals]) => {
        const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
        return {
          actividad,
          tiempoPromedio: `${avg.toFixed(1)} días`,
          severidad: avg >= 6 ? 'rojo' : avg >= 3 ? 'amarillo' : 'verde',
        };
      });
      return rows.sort((a, b) => (b.severidad > a.severidad ? 1 : -1)).slice(0, 5);
    }),
  );

  readonly procesosColumns = ['proceso', 'cliente', 'estado', 'tiempo'] as const;
  readonly cuellosColumns = ['actividad', 'tiempoPromedio', 'severidad'] as const;

  estadoLabel(estado: Tramite['estado']): string {
    switch (estado) {
      case 'iniciado':
        return 'Iniciado';
      case 'en_proceso':
        return 'En proceso';
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

  estadoSemaforo(estado: Tramite['estado']): 'rojo' | 'amarillo' | 'verde' {
    if (estado === 'demorado' || estado === 'cancelado') return 'rojo';
    if (estado === 'iniciado') return 'amarillo';
    return estado === 'completado' ? 'verde' : 'amarillo';
  }

  private toProcesoRow(t: Tramite): {
    proceso: string;
    cliente: string;
    estado: Tramite['estado'];
    tiempo: string;
  } {
    const creado = t.creadoEn ? new Date(t.creadoEn).getTime() : 0;
    const dias = creado ? Math.max(0, Math.round((Date.now() - creado) / 86400000)) : 0;
    return {
      proceso: t.politicaNombre ?? 'Proceso',
      cliente: this.clientesMock[t.clienteId] ?? t.clienteId,
      estado: t.estado,
      tiempo: creado ? `${dias} días` : '—',
    };
  }
}

