import { NgClass } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Tarea, etiquetaClienteReferencia } from '../../core/models/tarea.model';
import { Anomalia, MlService, RiesgoTarea } from '../../core/services/ml.service';
import { TareaService } from '../../core/services/tarea.service';
import type { Observable } from 'rxjs';

interface RiesgoConTarea {
  tarea: Tarea;
  riesgo: string;
  probabilidad: number;
  recomendacion: string;
}

@Component({
  selector: 'app-predicciones-ia',
  standalone: true,
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <div style="padding: 16px 0;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h2 style="margin:0; font-size:18px; font-weight:600;">
          <mat-icon style="vertical-align:middle; margin-right:8px; color:#7c3aed;">psychology</mat-icon>
          Predicciones IA — TensorFlow
        </h2>
        <button mat-stroked-button color="primary" (click)="cargar()" [disabled]="cargando()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </div>

      @if (cargando()) {
        <div style="text-align:center; padding:32px;">
          <mat-spinner diameter="40"></mat-spinner>
          <p style="color:#666; margin-top:12px;">Analizando con modelo TensorFlow...</p>
        </div>
      } @else {
        @if (riesgos().length > 0) {
          <mat-card appearance="outlined" class="resumen-ejecutivo">
            <div class="resumen-ejecutivo__titulo">Resumen ejecutivo</div>
            <p class="resumen-ejecutivo__texto">{{ textoResumenEjecutivo() }}</p>
          </mat-card>
        }

        <div class="riesgo-cards">
          <mat-card appearance="outlined" class="riesgo-card riesgo-card--alto">
            <div class="riesgo-card__label">Riesgo ALTO</div>
            <div class="riesgo-card__value">{{ contarRiesgo('ALTO') }}</div>
            <div class="riesgo-card__hint">tareas críticas</div>
          </mat-card>
          <mat-card appearance="outlined" class="riesgo-card riesgo-card--medio">
            <div class="riesgo-card__label">Riesgo MEDIO</div>
            <div class="riesgo-card__value">{{ contarRiesgo('MEDIO') }}</div>
            <div class="riesgo-card__hint">tareas a revisar</div>
          </mat-card>
          <mat-card appearance="outlined" class="riesgo-card riesgo-card--bajo">
            <div class="riesgo-card__label">Riesgo BAJO</div>
            <div class="riesgo-card__value">{{ contarRiesgo('BAJO') }}</div>
            <div class="riesgo-card__hint">tareas en tiempo</div>
          </mat-card>
        </div>

        @if (riesgos().length > 0) {
          <h3 class="seccion-titulo">Recomendaciones de prioridad</h3>
          <ol class="prioridad-lista">
            @for (r of riesgos(); track r.tarea.id) {
              <li class="prioridad-item">
                <span class="prioridad-cliente">{{ nombreCliente(r.tarea) }}</span>
                <span class="prioridad-sep">→</span>
                <span>{{ r.tarea.actividadEtiqueta || '—' }}</span>
                <span class="prioridad-sep">→</span>
                <span>{{ r.tarea.diasAbierto ?? 0 }} días</span>
                <span class="prioridad-sep">→</span>
                <span>{{ r.tarea.departamentoTexto || '—' }}</span>
              </li>
            }
          </ol>

          <h3 class="seccion-titulo">Análisis de riesgo por tarea</h3>
          <div class="riesgo-lista">
            @for (r of riesgos(); track r.tarea.id) {
              <div class="riesgo-fila">
                <span
                  class="riesgo-badge"
                  [ngClass]="{
                    'riesgo-badge--alto': r.riesgo === 'ALTO',
                    'riesgo-badge--medio': r.riesgo === 'MEDIO',
                    'riesgo-badge--bajo': r.riesgo === 'BAJO'
                  }"
                >
                  {{ r.riesgo }}
                </span>
                <div class="riesgo-fila__body">
                  <div class="riesgo-fila__meta">
                    <strong>{{ nombreCliente(r.tarea) }}</strong>
                    <span class="riesgo-fila__sep">·</span>
                    <span>{{ r.tarea.actividadEtiqueta || '—' }}</span>
                    <span class="riesgo-fila__sep">·</span>
                    <span>{{ r.tarea.departamentoTexto || '—' }}</span>
                    <span class="riesgo-fila__sep">·</span>
                    <span>{{ r.tarea.diasAbierto ?? 0 }} días abierto</span>
                  </div>
                  <div class="riesgo-fila__recom">{{ r.recomendacion }}</div>
                </div>
                <div class="riesgo-fila__prob">{{ (r.probabilidad * 100).toFixed(0) }}%</div>
              </div>
            }
          </div>
        }

        <h3 class="seccion-titulo">
          <mat-icon class="seccion-titulo__icon">warning</mat-icon>
          Detección de anomalías
        </h3>
        <div class="tabla-wrap">
          <table mat-table [dataSource]="anomalias()" class="tabla-anomalias">
            <ng-container matColumnDef="cliente">
              <th mat-header-cell *matHeaderCellDef>Cliente</th>
              <td mat-cell *matCellDef="let a">{{ a.cliente_nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="politica">
              <th mat-header-cell *matHeaderCellDef>Política</th>
              <td mat-cell *matCellDef="let a">{{ a.politica_nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="actividad">
              <th mat-header-cell *matHeaderCellDef>Actividad actual</th>
              <td mat-cell *matCellDef="let a">{{ actividadAnomalia(a) }}</td>
            </ng-container>
            <ng-container matColumnDef="dias">
              <th mat-header-cell *matHeaderCellDef>Días abierto</th>
              <td mat-cell *matCellDef="let a">{{ a.dias_abierto }}</td>
            </ng-container>
            <ng-container matColumnDef="promedio">
              <th mat-header-cell *matHeaderCellDef>Promedio histórico</th>
              <td mat-cell *matCellDef="let a">{{ a.promedio_historico }}</td>
            </ng-container>
            <ng-container matColumnDef="anomalia">
              <th mat-header-cell *matHeaderCellDef>Anomalía</th>
              <td mat-cell *matCellDef="let a">
                @if (a.es_anomalia) {
                  <span class="anomalia-si">⚠️ SÍ</span>
                } @else {
                  <span class="anomalia-no">✓ Normal</span>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnasAnomalias"></tr>
            <tr mat-row *matRowDef="let row; columns: columnasAnomalias"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .resumen-ejecutivo {
        padding: 16px 20px;
        margin-bottom: 20px;
        border-left: 4px solid #7c3aed;
        background: #faf5ff;
      }
      .resumen-ejecutivo__titulo {
        font-size: 13px;
        font-weight: 700;
        color: #6d28d9;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .resumen-ejecutivo__texto {
        margin: 0;
        font-size: 15px;
        color: #374151;
      }
      .riesgo-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      .riesgo-card {
        padding: 16px;
      }
      .riesgo-card--alto {
        border-left: 4px solid #dc2626;
      }
      .riesgo-card--medio {
        border-left: 4px solid #d97706;
      }
      .riesgo-card--bajo {
        border-left: 4px solid #16a34a;
      }
      .riesgo-card__label {
        font-size: 13px;
        color: #666;
      }
      .riesgo-card__value {
        font-size: 28px;
        font-weight: 700;
      }
      .riesgo-card--alto .riesgo-card__value {
        color: #dc2626;
      }
      .riesgo-card--medio .riesgo-card__value {
        color: #d97706;
      }
      .riesgo-card--bajo .riesgo-card__value {
        color: #16a34a;
      }
      .riesgo-card__hint {
        font-size: 11px;
        color: #999;
      }
      .seccion-titulo {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .seccion-titulo__icon {
        font-size: 18px;
        color: #f59e0b;
      }
      .prioridad-lista {
        margin: 0 0 24px;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .prioridad-item {
        font-size: 13px;
        color: #374151;
      }
      .prioridad-cliente {
        font-weight: 600;
      }
      .prioridad-sep {
        margin: 0 6px;
        color: #9ca3af;
      }
      .riesgo-lista {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 24px;
      }
      .riesgo-fila {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
      .riesgo-badge {
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .riesgo-badge--alto {
        background: #fee2e2;
        color: #dc2626;
      }
      .riesgo-badge--medio {
        background: #fef3c7;
        color: #d97706;
      }
      .riesgo-badge--bajo {
        background: #dcfce7;
        color: #16a34a;
      }
      .riesgo-fila__body {
        flex: 1;
        min-width: 0;
      }
      .riesgo-fila__meta {
        font-size: 13px;
        color: #374151;
        margin-bottom: 4px;
      }
      .riesgo-fila__sep {
        margin: 0 4px;
        color: #9ca3af;
      }
      .riesgo-fila__recom {
        font-size: 12px;
        color: #6b7280;
      }
      .riesgo-fila__prob {
        font-size: 12px;
        color: #9ca3af;
        flex-shrink: 0;
      }
      .tabla-wrap {
        overflow-x: auto;
      }
      .tabla-anomalias {
        width: 100%;
      }
      .anomalia-si {
        color: #dc2626;
        font-weight: 700;
      }
      .anomalia-no {
        color: #16a34a;
      }
    `,
  ],
})
export class PrediccionesIaComponent implements OnInit {
  private readonly mlService = inject(MlService);
  private readonly tareaService = inject(TareaService);

  readonly cargando = signal(false);
  readonly riesgos = signal<RiesgoConTarea[]>([]);
  readonly anomalias = signal<Anomalia[]>([]);
  private readonly actividadPorTramite = signal<Map<string, string>>(new Map());

  readonly columnasAnomalias = [
    'cliente',
    'politica',
    'actividad',
    'dias',
    'promedio',
    'anomalia',
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.riesgos.set([]);
    this.mlService.getAnomalias().subscribe({
      next: (anomalias) => {
        this.anomalias.set(anomalias);
        this.cargarRiesgos();
      },
      error: () => this.cargando.set(false),
    });
  }

  contarRiesgo(nivel: string): number {
    return this.riesgos().filter((r) => r.riesgo === nivel).length;
  }

  nombreCliente(tarea: Tarea): string {
    return etiquetaClienteReferencia(tarea);
  }

  actividadAnomalia(anomalia: Anomalia): string {
    const actividad = this.actividadPorTramite().get(anomalia.tramite_id);
    return actividad?.trim() || '—';
  }

  textoResumenEjecutivo(): string {
    const criticos = this.contarTramitesCriticos();
    const dept = this.departamentoConMasRiesgoAlto();
    return `${criticos} trámite${criticos === 1 ? '' : 's'} crítico${criticos === 1 ? '' : 's'}. Departamento con más carga: ${dept}`;
  }

  private contarTramitesCriticos(): number {
    const altos = this.riesgos().filter((r) => r.riesgo === 'ALTO');
    return new Set(altos.map((r) => r.tarea.tramiteId).filter(Boolean)).size;
  }

  private departamentoConMasRiesgoAlto(): string {
    const conteo = new Map<string, number>();
    for (const r of this.riesgos().filter((x) => x.riesgo === 'ALTO')) {
      const dept = (r.tarea.departamentoTexto ?? '').trim() || 'Sin departamento';
      conteo.set(dept, (conteo.get(dept) ?? 0) + 1);
    }
    if (conteo.size === 0) {
      return '—';
    }
    let mejor = '—';
    let max = 0;
    for (const [dept, count] of conteo) {
      if (count > max) {
        max = count;
        mejor = dept;
      }
    }
    return mejor;
  }

  private construirRecomendacion(tarea: Tarea, riesgo: string): string {
    const actividad = tarea.actividadEtiqueta?.trim() || 'Actividad';
    const departamento = tarea.departamentoTexto?.trim() || '—';
    const dias = tarea.diasAbierto ?? 0;
    if (riesgo === 'ALTO') {
      return `Atender de inmediato — ${actividad} lleva ${dias} días`;
    }
    if (riesgo === 'MEDIO') {
      return `Revisar pronto — ${actividad} en ${departamento}`;
    }
    return 'En tiempo normal — continuar proceso';
  }

  private indexarActividadPorTramite(tareas: Tarea[]): void {
    const map = new Map<string, string>();
    for (const t of tareas) {
      if (!t.tramiteId) {
        continue;
      }
      const actividad = t.actividadEtiqueta?.trim();
      if (actividad) {
        map.set(t.tramiteId, actividad);
      }
    }
    this.actividadPorTramite.set(map);
  }

  private cargarRiesgos(): void {
    this.tareaService.getTareas().subscribe({
      next: (tareas: Tarea[]) => {
        this.indexarActividadPorTramite(tareas);

        const pendientes = tareas.filter((t) => t.estado !== 'completado');
        if (!pendientes.length) {
          this.riesgos.set([]);
          this.cargando.set(false);
          return;
        }

        const seleccionadas = pendientes.slice(0, 10);
        const requests: Observable<RiesgoTarea>[] = seleccionadas.map((t) =>
          this.mlService.getRiesgo(
            t.id ?? '',
            t.diasAbierto ?? 0,
            1440,
            t.pasoActual ?? 0,
            t.totalPasos ?? 1,
          ),
        );

        let completados = 0;
        const resultados: RiesgoConTarea[] = [];
        requests.forEach((req, index) => {
          const tarea = seleccionadas[index]!;
          req.subscribe({
            next: (r: RiesgoTarea) => {
              resultados.push({
                tarea,
                riesgo: r.riesgo,
                probabilidad: r.probabilidad,
                recomendacion: this.construirRecomendacion(tarea, r.riesgo),
              });
              completados++;
              if (completados === requests.length) {
                resultados.sort((a, b) => b.probabilidad - a.probabilidad);
                this.riesgos.set(resultados);
                this.cargando.set(false);
              }
            },
            error: () => {
              completados++;
              if (completados === requests.length) {
                resultados.sort((a, b) => b.probabilidad - a.probabilidad);
                this.riesgos.set(resultados);
                this.cargando.set(false);
              }
            },
          });
        });
      },
      error: () => this.cargando.set(false),
    });
  }
}
