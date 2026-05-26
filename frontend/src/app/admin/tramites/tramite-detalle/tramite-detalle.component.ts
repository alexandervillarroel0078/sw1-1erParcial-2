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
import { InformeService } from '../../../core/services/informe.service';
import { TramiteService } from '../../../core/services/tramite.service';
import { DocumentosComponent } from '../../../shared/documentos/documentos.component';

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
    DocumentosComponent,
  ],
  templateUrl: './tramite-detalle.component.html',
  styleUrl: './tramite-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TramiteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tramiteService = inject(TramiteService);
  private readonly informeService = inject(InformeService);

  readonly detalle$ = this.route.paramMap.pipe(
    map((p) => p.get('id')),
    filter((id): id is string => !!id),
    switchMap((id) => this.tramiteService.getDetalleTramite(id)),
  );

  volver(): void {
    void this.router.navigate(['/admin/monitor']);
  }

  /** Solo tareas ligadas a nodos ACTIVIDAD (excluye DECISION, START, etc. si aparecieran en API). */
  tareasSoloActividad(d: TramiteDetalleResponse): TramiteDetalleTarea[] {
    return d.tareas.filter((task) => {
      const tipo = (task.tipoNodo ?? 'ACTIVIDAD').toUpperCase();
      return tipo === 'ACTIVIDAD';
    });
  }

  totalPasos(d: TramiteDetalleResponse): number {
    const t = d.tramite.totalPasos;
    if (t != null && t > 0) {
      return t;
    }
    const n = this.tareasSoloActividad(d).length;
    return Math.max(1, n);
  }

  /** Pasos humanos (solo nodos ACTIVIDAD): número + etiqueta deducida del historial filtrado. */
  pasosFlujoActividad(d: TramiteDetalleResponse): { paso: number; etiqueta: string }[] {
    const tot = this.totalPasos(d);
    const out: { paso: number; etiqueta: string }[] = [];
    const ordenadas = [...this.tareasSoloActividad(d)].sort(
      (a, b) =>
        +new Date(a.creadoEn ?? 0) - +new Date(b.creadoEn ?? 0),
    );
    const vistos = new Set<string>();
    for (const t of ordenadas) {
      const nid = (t.nodoFlujoId ?? '').trim();
      if (!nid || vistos.has(nid)) {
        continue;
      }
      vistos.add(nid);
      out.push({
        paso: out.length + 1,
        etiqueta:
          t.actividadEtiqueta?.trim() || `Actividad ${out.length + 1}`,
      });
      if (out.length >= tot) {
        break;
      }
    }
    while (out.length < tot) {
      out.push({
        paso: out.length + 1,
        etiqueta: `Actividad ${out.length + 1}`,
      });
    }
    return out;
  }

  /** Actividades ACTIVIDAD ya completadas (API); por defecto 0. */
  pasoActividadesCompletadas(d: TramiteDetalleResponse): number {
    const p = d.tramite.pasoActual;
    if (p != null && p >= 0) {
      return p;
    }
    return 0;
  }

  stepState(
    d: TramiteDetalleResponse,
    step: number,
  ): 'done' | 'current' | 'pending' {
    const est = (d.tramite.estado ?? '').toUpperCase();
    if (est === 'COMPLETADO') {
      return 'done';
    }
    const tot = this.totalPasos(d);
    const c = this.pasoActividadesCompletadas(d);
    if (step <= c) {
      return 'done';
    }
    if (step === c + 1 && c < tot) {
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
    if (e === 'DEMORADO') {
      return 'dot--rojo';
    }
    if (e === 'EN_ATENCION') {
      return 'dot--amarillo';
    }
    return 'dot--gris';
  }

  tramiteEsDemorado(d: TramiteDetalleResponse): boolean {
    return (d.tramite.estado ?? '').toUpperCase() === 'DEMORADO';
  }

  tareaMostrarChipEnAtencion(t: TramiteDetalleTarea): boolean {
    return this.tareaEstadoUpper(t) === 'EN_ATENCION';
  }

  tareaMostrarChipDemoradoTramite(
    t: TramiteDetalleTarea,
    d: TramiteDetalleResponse,
  ): boolean {
    return this.tareaMostrarChipEnAtencion(t) && this.tramiteEsDemorado(d);
  }

  tareaMostrarChipDemoradoSoloTarea(t: TramiteDetalleTarea): boolean {
    return this.tareaEstadoUpper(t) === 'DEMORADO';
  }

  tareaMostrarChipEstadoMuted(t: TramiteDetalleTarea): boolean {
    const e = this.tareaEstadoUpper(t);
    return e !== 'EN_ATENCION' && e !== 'DEMORADO';
  }

  tareaEstadoLegible(t: TramiteDetalleTarea): string {
    const e = this.tareaEstadoUpper(t);
    switch (e) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_ATENCION':
        return 'En atención';
      case 'DEMORADO':
        return 'Demorado';
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
    if (e === 'DEMORADO') {
      return 'Actividad marcada por vencimiento de SLA';
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
    const arch = i.archivos?.length ?? 0;
    return !!(
      (i.descripcion && i.descripcion.trim()) ||
      (i.resultado && i.resultado.trim()) ||
      i.enviadoEn ||
      arch > 0
    );
  }

  verAdjuntoInforme(id: string): void {
    this.informeService.verArchivoNuevaPestana(id);
  }

  esPdfAdjunto(tipo?: string | null): boolean {
    return (tipo ?? '').toLowerCase().includes('pdf');
  }

  iconoAdjunto(tipo?: string | null): string {
    return this.esPdfAdjunto(tipo) ? 'picture_as_pdf' : 'image';
  }
}
