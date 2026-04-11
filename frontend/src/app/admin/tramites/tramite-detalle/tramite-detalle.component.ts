import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { filter, map, switchMap } from 'rxjs/operators';

import {
  TramiteDetalleResponse,
  TramiteDetalleTarea,
} from '../../../core/models/tramite-detalle.model';
import { TramiteService } from '../../../core/services/tramite.service';

@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    DatePipe,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
  ],
  templateUrl: './tramite-detalle.component.html',
  styleUrl: './tramite-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TramiteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tramiteService = inject(TramiteService);

  readonly detalle$ = this.route.paramMap.pipe(
    map((p) => p.get('id')),
    filter((id): id is string => !!id),
    switchMap((id) => this.tramiteService.getDetalleTramite(id)),
  );

  volver(): void {
    void this.router.navigate(['/admin/monitor']);
  }

  totalPasos(d: TramiteDetalleResponse): number {
    const t = d.tramite.totalPasos;
    if (t != null && t > 0) {
      return t;
    }
    return Math.max(1, d.tareas.length);
  }

  stepsArray(d: TramiteDetalleResponse): number[] {
    const n = this.totalPasos(d);
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  pasoActualClamped(d: TramiteDetalleResponse): number {
    const tot = this.totalPasos(d);
    const p = d.tramite.pasoActual ?? 1;
    return Math.min(Math.max(1, p), tot);
  }

  stepState(
    d: TramiteDetalleResponse,
    step: number,
  ): 'done' | 'current' | 'pending' {
    const est = (d.tramite.estado ?? '').toUpperCase();
    if (est === 'COMPLETADO') {
      return 'done';
    }
    const cur = this.pasoActualClamped(d);
    if (step < cur) {
      return 'done';
    }
    if (step === cur) {
      return 'current';
    }
    return 'pending';
  }

  stepIcon(d: TramiteDetalleResponse, step: number): string {
    const s = this.stepState(d, step);
    if (s === 'done') {
      return '✅';
    }
    if (s === 'current') {
      return '⏳';
    }
    return '⬜';
  }

  stepCaption(d: TramiteDetalleResponse, step: number): string {
    const s = this.stepState(d, step);
    if (s === 'done') {
      return 'Completado';
    }
    if (s === 'current') {
      return 'Actual';
    }
    return 'Pendiente';
  }

  diasActivoTramite(d: TramiteDetalleResponse): number {
    const f = d.tramite.creadoEn;
    if (!f) {
      return 0;
    }
    const ms = Date.now() - new Date(f).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  }

  estadoTramiteLabel(estado?: string | null): string {
    const k = (estado ?? '').toUpperCase();
    switch (k) {
      case 'INICIADO':
        return 'Iniciado';
      case 'EN_PROCESO':
        return 'En proceso';
      case 'ESPERANDO_DECISION':
        return 'Esperando decisión';
      case 'DEMORADO':
        return 'Demorado';
      case 'COMPLETADO':
        return 'Completado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return estado ?? '—';
    }
  }

  badgeTramiteClass(estado?: string | null): string {
    const k = (estado ?? '').toUpperCase();
    switch (k) {
      case 'DEMORADO':
        return 'badge--rojo';
      case 'EN_PROCESO':
      case 'ESPERANDO_DECISION':
        return 'badge--amarillo';
      case 'COMPLETADO':
        return 'badge--verde';
      case 'CANCELADO':
        return 'badge--gris';
      case 'INICIADO':
      default:
        return 'badge--azul';
    }
  }

  tareaEstadoUpper(t: TramiteDetalleTarea): string {
    return (t.estado ?? '').toUpperCase();
  }

  tareaDotClass(t: TramiteDetalleTarea): string {
    const e = this.tareaEstadoUpper(t);
    if (e === 'COMPLETADO') {
      return 'dot--verde';
    }
    if (e === 'EN_ATENCION') {
      return 'dot--amarillo';
    }
    return 'dot--gris';
  }

  tareaEstadoLegible(t: TramiteDetalleTarea): string {
    const e = this.tareaEstadoUpper(t);
    switch (e) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_ATENCION':
        return 'En atención';
      case 'COMPLETADO':
        return 'Completado';
      default:
        return t.estado ?? '—';
    }
  }

  tareaSubtitulo(t: TramiteDetalleTarea): string {
    const e = this.tareaEstadoUpper(t);
    if (e === 'PENDIENTE') {
      return 'Esperando ser desbloqueado';
    }
    if (e === 'EN_ATENCION') {
      return 'En proceso — informe pendiente';
    }
    if (e === 'COMPLETADO' && t.completadoEn) {
      return `Completada el ${new Date(t.completadoEn).toLocaleString()}`;
    }
    if (e === 'COMPLETADO') {
      return 'Completada';
    }
    return '';
  }

  tieneContenidoInforme(t: TramiteDetalleTarea): boolean {
    const i = t.informe;
    if (!i) {
      return false;
    }
    return !!(
      (i.descripcion && i.descripcion.trim()) ||
      (i.resultado && i.resultado.trim()) ||
      i.enviadoEn
    );
  }
}
