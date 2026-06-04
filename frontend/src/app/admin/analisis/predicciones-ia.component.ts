import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Tarea, etiquetaClienteReferencia } from '../../core/models/tarea.model';
import {
  Anomalia,
  EstadoAnomalia,
  MlService,
  RiesgoTarea,
  TrainingHistory,
} from '../../core/services/ml.service';
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
    <div class="predicciones">
      <header class="predicciones__header">
        <h2 class="predicciones__titulo">
          <mat-icon class="predicciones__titulo-icon">psychology</mat-icon>
          Predicciones IA — TensorFlow
        </h2>
        <button mat-stroked-button color="primary" (click)="cargar()" [disabled]="cargando()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </header>

      @if (cargando()) {
        <div class="predicciones__loading">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Analizando con modelo TensorFlow...</p>
        </div>
      } @else {
        <section class="resumen-seccion">
          <h3 class="seccion-titulo">Resumen ejecutivo</h3>
          <div class="riesgo-cards">
            <mat-card appearance="outlined" class="riesgo-card riesgo-card--alto">
              <mat-icon class="riesgo-card__icon">error</mat-icon>
              <div class="riesgo-card__body">
                <div class="riesgo-card__label">Riesgo ALTO</div>
                <div class="riesgo-card__value">{{ contarRiesgo('ALTO') }}</div>
                <div class="riesgo-card__hint">tareas críticas</div>
              </div>
            </mat-card>
            <mat-card appearance="outlined" class="riesgo-card riesgo-card--medio">
              <mat-icon class="riesgo-card__icon">warning_amber</mat-icon>
              <div class="riesgo-card__body">
                <div class="riesgo-card__label">Riesgo MEDIO</div>
                <div class="riesgo-card__value">{{ contarRiesgo('MEDIO') }}</div>
                <div class="riesgo-card__hint">tareas a revisar</div>
              </div>
            </mat-card>
            <mat-card appearance="outlined" class="riesgo-card riesgo-card--bajo">
              <mat-icon class="riesgo-card__icon">check_circle</mat-icon>
              <div class="riesgo-card__body">
                <div class="riesgo-card__label">Riesgo BAJO</div>
                <div class="riesgo-card__value">{{ contarRiesgo('BAJO') }}</div>
                <div class="riesgo-card__hint">tareas en tiempo</div>
              </div>
            </mat-card>
          </div>
          @if (riesgos().length > 0) {
            <p class="resumen-ejecutivo__texto">{{ textoResumenEjecutivo() }}</p>
          }
        </section>

        <section class="metricas-seccion">
          <div class="metricas-seccion__header">
            <h3 class="seccion-titulo">Métricas del modelo</h3>
            @if (trainingHistory()) {
              <span class="accuracy-badge">
                Accuracy validación: {{ accuracyFinalPct() }}
              </span>
            }
          </div>
          @if (trainingHistory()) {
            <div class="metricas-grid">
              <mat-card appearance="outlined" class="metrica-card">
                <div class="metrica-card__titulo">Accuracy por época</div>
                <div class="metrica-chart-wrap">
                  <canvas #canvasAccuracy aria-label="Accuracy por época"></canvas>
                </div>
              </mat-card>
              <mat-card appearance="outlined" class="metrica-card">
                <div class="metrica-card__titulo">Loss por época</div>
                <div class="metrica-chart-wrap">
                  <canvas #canvasLoss aria-label="Loss por época"></canvas>
                </div>
              </mat-card>
            </div>
          } @else {
            <p class="metricas-aviso">
              @if (metricasSinDatos()) {
                Ejecuta el entrenamiento del modelo para generar
                <code>training/history.json</code>
                y ver las curvas de accuracy y loss.
              } @else {
                Cargando métricas del entrenamiento...
              }
            </p>
          }
        </section>

        @if (riesgos().length > 0) {
          <section class="bloque-seccion">
            <h3 class="seccion-titulo">Recomendaciones de prioridad</h3>
            <ul class="prioridad-lista">
              @for (r of riesgos().slice(0, 5); track r.tarea.id; let i = $index) {
                <li class="prioridad-item">
                  <span class="prioridad-orden" [ngClass]="claseOrdenPrioridad(i)">{{ i + 1 }}</span>
                  <div class="prioridad-item__content">
                    <div class="prioridad-item__fila">
                      <span class="prioridad-cliente">{{ nombreCliente(r.tarea) }}</span>
                      <span class="badge-dias" [ngClass]="claseBadgeDias(r.tarea.diasAbierto ?? 0)">
                        {{ r.tarea.diasAbierto ?? 0 }} días
                      </span>
                    </div>
                    <div class="prioridad-item__detalle">
                      {{ r.tarea.actividadEtiqueta || '—' }}
                      ·
                      {{ r.tarea.departamentoTexto || '—' }}
                    </div>
                  </div>
                </li>
              }
            </ul>
          </section>

          <section class="bloque-seccion">
            <h3 class="seccion-titulo">Análisis de riesgo por tarea</h3>
            <div class="riesgo-tarea-grid">
              @for (r of riesgos(); track r.tarea.id) {
                <mat-card appearance="outlined" class="riesgo-tarea-card">
                  <div class="riesgo-tarea-card__top">
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
                    <span class="riesgo-tarea-card__pct">{{ (r.probabilidad * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="riesgo-bar" role="presentation">
                    <div
                      class="riesgo-bar__fill"
                      [ngClass]="claseBarraRiesgo(r.riesgo)"
                      [style.width.%]="r.probabilidad * 100"
                    ></div>
                  </div>
                  <p class="riesgo-tarea-card__meta">
                    {{ nombreCliente(r.tarea) }}
                    ·
                    {{ r.tarea.actividadEtiqueta || '—' }}
                    ·
                    {{ r.tarea.departamentoTexto || '—' }}
                    ·
                    {{ r.tarea.diasAbierto ?? 0 }} días
                  </p>
                  <p class="riesgo-tarea-card__recom">{{ r.recomendacion }}</p>
                </mat-card>
              }
            </div>
          </section>
        }

        <section class="bloque-seccion">
          <h3 class="seccion-titulo">
            <mat-icon class="seccion-titulo__icon">insights</mat-icon>
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
                <th mat-header-cell *matHeaderCellDef>Actividad</th>
                <td mat-cell *matCellDef="let a">{{ actividadAnomalia(a) }}</td>
              </ng-container>
              <ng-container matColumnDef="dias">
                <th mat-header-cell *matHeaderCellDef>Días abierto</th>
                <td mat-cell *matCellDef="let a">{{ a.dias_abierto }}</td>
              </ng-container>
              <ng-container matColumnDef="promedio">
                <th mat-header-cell *matHeaderCellDef>Promedio</th>
                <td mat-cell *matCellDef="let a">{{ a.promedio_historico }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let a">
                  @switch (estadoAnomalia(a)) {
                    @case ('ANOMALIA') {
                      <span class="estado-badge estado-badge--anomalia">Anomalía</span>
                    }
                    @case ('ADVERTENCIA') {
                      <span class="estado-badge estado-badge--advertencia">Advertencia</span>
                    }
                    @default {
                      <span class="estado-badge estado-badge--normal">Normal</span>
                    }
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columnasAnomalias"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columnasAnomalias; let i = index"
                [class.tabla-anomalias__fila--par]="i % 2 === 1"
              ></tr>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .predicciones {
        padding: 16px 0;
        max-width: 100%;
        overflow-x: hidden;
      }
      .predicciones__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .predicciones__titulo {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .predicciones__titulo-icon {
        color: #7c3aed;
      }
      .predicciones__loading {
        text-align: center;
        padding: 32px;
      }
      .predicciones__loading p {
        color: rgba(0, 0, 0, 0.6);
        margin-top: 12px;
      }
      .resumen-seccion {
        margin-bottom: 28px;
      }
      .resumen-ejecutivo__texto {
        margin: 14px 0 0;
        font-size: 14px;
        line-height: 1.5;
        color: rgba(0, 0, 0, 0.55);
      }
      .riesgo-cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }
      @media (max-width: 720px) {
        .riesgo-cards {
          grid-template-columns: 1fr;
        }
      }
      .riesgo-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 16px;
      }
      .riesgo-card__icon {
        width: 44px;
        height: 44px;
        font-size: 44px;
        flex-shrink: 0;
      }
      .riesgo-card--alto {
        border-left: 4px solid #f44336;
        background: #ffebee;
      }
      .riesgo-card--alto .riesgo-card__icon {
        color: #d32f2f;
      }
      .riesgo-card--medio {
        border-left: 4px solid #ff9800;
        background: #fff8e1;
      }
      .riesgo-card--medio .riesgo-card__icon {
        color: #f57c00;
      }
      .riesgo-card--bajo {
        border-left: 4px solid #4caf50;
        background: #e8f5e9;
      }
      .riesgo-card--bajo .riesgo-card__icon {
        color: #388e3c;
      }
      .riesgo-card__label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: rgba(0, 0, 0, 0.55);
      }
      .riesgo-card__value {
        font-size: 32px;
        font-weight: 800;
        line-height: 1.1;
      }
      .riesgo-card--alto .riesgo-card__value {
        color: #c62828;
      }
      .riesgo-card--medio .riesgo-card__value {
        color: #e65100;
      }
      .riesgo-card--bajo .riesgo-card__value {
        color: #2e7d32;
      }
      .riesgo-card__hint {
        font-size: 11px;
        color: rgba(0, 0, 0, 0.45);
      }
      .bloque-seccion {
        margin-bottom: 28px;
      }
      .seccion-titulo {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 14px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .seccion-titulo__icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ff9800;
      }
      .prioridad-lista {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .prioridad-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 10px;
        background: #fff;
      }
      .prioridad-orden {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
      }
      .prioridad-orden--rojo {
        background: #d32f2f;
      }
      .prioridad-orden--naranja {
        background: #f57c00;
      }
      .prioridad-item__content {
        flex: 1;
        min-width: 0;
      }
      .prioridad-item__fila {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .prioridad-cliente {
        font-weight: 700;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.87);
      }
      .prioridad-item__detalle {
        margin-top: 4px;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.55);
      }
      .badge-dias {
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .badge-dias--rojo {
        background: #ffebee;
        color: #c62828;
      }
      .badge-dias--naranja {
        background: #fff3e0;
        color: #e65100;
      }
      .badge-dias--verde {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .riesgo-tarea-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
      .riesgo-tarea-card {
        padding: 12px 14px !important;
      }
      .riesgo-tarea-card__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .riesgo-badge {
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
      .riesgo-badge--alto {
        background: #ffcdd2;
        color: #b71c1c;
      }
      .riesgo-badge--medio {
        background: #ffe0b2;
        color: #e65100;
      }
      .riesgo-badge--bajo {
        background: #c8e6c9;
        color: #1b5e20;
      }
      .riesgo-tarea-card__pct {
        font-size: 12px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.45);
      }
      .riesgo-bar {
        height: 6px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.08);
        overflow: hidden;
        margin-bottom: 8px;
      }
      .riesgo-bar__fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .riesgo-bar__fill--alto {
        background: #f44336;
      }
      .riesgo-bar__fill--medio {
        background: #ff9800;
      }
      .riesgo-bar__fill--bajo {
        background: #4caf50;
      }
      .riesgo-tarea-card__meta {
        margin: 0 0 6px;
        font-size: 12px;
        line-height: 1.45;
        color: rgba(0, 0, 0, 0.7);
        word-break: break-word;
      }
      .riesgo-tarea-card__recom {
        margin: 0;
        font-size: 12px;
        font-style: italic;
        color: rgba(0, 0, 0, 0.55);
        line-height: 1.4;
      }
      .tabla-wrap {
        width: 100%;
        overflow-x: hidden;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
      }
      .tabla-anomalias {
        width: 100%;
        table-layout: fixed;
      }
      .tabla-anomalias th {
        font-size: 12px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.7);
        background: #f5f5f5;
      }
      .tabla-anomalias td,
      .tabla-anomalias th {
        padding: 10px 8px;
        word-break: break-word;
        font-size: 12px;
      }
      .tabla-anomalias__fila--par {
        background: #fafafa;
      }
      .estado-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .estado-badge--anomalia {
        background: #ffebee;
        color: #c62828;
      }
      .estado-badge--advertencia {
        background: #fff3e0;
        color: #e65100;
      }
      .estado-badge--normal {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .metricas-seccion {
        margin-bottom: 28px;
      }
      .metricas-seccion__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .accuracy-badge {
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
        background: #e8eaf6;
        color: #3949ab;
      }
      .metricas-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      @media (max-width: 900px) {
        .metricas-grid {
          grid-template-columns: 1fr;
        }
      }
      .metrica-card {
        padding: 14px 16px !important;
      }
      .metrica-card__titulo {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: rgba(0, 0, 0, 0.8);
      }
      .metrica-chart-wrap {
        height: 220px;
        position: relative;
      }
      .metricas-aviso {
        margin: 0;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.55);
        line-height: 1.5;
      }
      .metricas-aviso code {
        font-size: 12px;
      }
    `,
  ],
})
export class PrediccionesIaComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mlService = inject(MlService);
  private readonly tareaService = inject(TareaService);

  @ViewChild('canvasAccuracy') canvasAccuracy!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasLoss') canvasLoss!: ElementRef<HTMLCanvasElement>;

  readonly cargando = signal(false);
  readonly riesgos = signal<RiesgoConTarea[]>([]);
  readonly anomalias = signal<Anomalia[]>([]);
  readonly trainingHistory = signal<TrainingHistory | null>(null);
  readonly metricasSinDatos = signal(false);
  private readonly actividadPorTramite = signal<Map<string, string>>(new Map());
  private chartAccuracy: Chart | null = null;
  private chartLoss: Chart | null = null;

  readonly columnasAnomalias = [
    'cliente',
    'politica',
    'actividad',
    'dias',
    'promedio',
    'estado',
  ];

  ngOnInit(): void {
    this.cargar();
    this.cargarMetricasModelo();
  }

  ngAfterViewInit(): void {
    if (this.trainingHistory()) {
      this.scheduleRenderMetricasCharts();
    }
  }

  ngOnDestroy(): void {
    this.chartAccuracy?.destroy();
    this.chartLoss?.destroy();
  }

  accuracyFinalPct(): string {
    const vals = this.trainingHistory()?.val_accuracy;
    if (!vals?.length) {
      return '—';
    }
    const last = vals[vals.length - 1]!;
    return `${(last * 100).toFixed(1)}%`;
  }

  private scheduleRenderMetricasCharts(): void {
    setTimeout(() => this.renderMetricasCharts(), 100);
  }

  private finalizarCargaPrincipal(): void {
    this.cargando.set(false);
    if (this.trainingHistory()) {
      this.scheduleRenderMetricasCharts();
    }
  }

  cargarMetricasModelo(): void {
    this.metricasSinDatos.set(false);
    this.mlService.getTrainingHistory().subscribe({
      next: (history) => {
        this.trainingHistory.set(history);
        this.metricasSinDatos.set(false);
        this.scheduleRenderMetricasCharts();
      },
      error: () => {
        this.trainingHistory.set(null);
        this.metricasSinDatos.set(true);
      },
    });
  }

  private renderMetricasCharts(): void {
    const history = this.trainingHistory();
    if (!history) {
      return;
    }

    const accCanvas = this.canvasAccuracy?.nativeElement;
    const lossCanvas = this.canvasLoss?.nativeElement;
    if (!accCanvas || !lossCanvas) {
      return;
    }

    const epochs = history.loss.map((_, i) => String(i + 1));

    if (this.chartAccuracy) {
      this.chartAccuracy.destroy();
    }
    if (this.chartLoss) {
      this.chartLoss.destroy();
    }

    this.chartAccuracy = new Chart(accCanvas, {
      type: 'line',
      data: {
        labels: epochs,
        datasets: [
          {
            label: 'accuracy',
            data: history.accuracy,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            tension: 0.25,
            pointRadius: 2,
          },
          {
            label: 'val_accuracy',
            data: history.val_accuracy,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            tension: 0.25,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, max: 1 } },
      },
    });

    this.chartLoss = new Chart(lossCanvas, {
      type: 'line',
      data: {
        labels: epochs,
        datasets: [
          {
            label: 'loss',
            data: history.loss,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            tension: 0.25,
            pointRadius: 2,
          },
          {
            label: 'val_loss',
            data: history.val_loss,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            tension: 0.25,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.riesgos.set([]);
    this.cargarMetricasModelo();
    this.mlService.getAnomalias().subscribe({
      next: (anomalias) => {
        this.anomalias.set(anomalias);
        this.cargarRiesgos();
      },
      error: () => this.finalizarCargaPrincipal(),
    });
  }

  contarRiesgo(nivel: string): number {
    return this.riesgos().filter((r) => r.riesgo === nivel).length;
  }

  claseOrdenPrioridad(index: number): string {
    return index < 3 ? 'prioridad-orden--rojo' : 'prioridad-orden--naranja';
  }

  claseBadgeDias(dias: number): string {
    if (dias > 20) {
      return 'badge-dias--rojo';
    }
    if (dias > 7) {
      return 'badge-dias--naranja';
    }
    return 'badge-dias--verde';
  }

  claseBarraRiesgo(riesgo: string): string {
    const nivel = riesgo.toLowerCase();
    if (nivel === 'alto' || nivel === 'medio' || nivel === 'bajo') {
      return `riesgo-bar__fill--${nivel}`;
    }
    return 'riesgo-bar__fill--medio';
  }

  nombreCliente(tarea: Tarea): string {
    return etiquetaClienteReferencia(tarea);
  }

  actividadAnomalia(anomalia: Anomalia): string {
    const actividad = this.actividadPorTramite().get(anomalia.tramite_id);
    return actividad?.trim() || '—';
  }

  /** Usa `estado` del API o recalcula con la misma regla del ml-service. */
  estadoAnomalia(a: Anomalia): EstadoAnomalia {
    if (a.estado === 'ANOMALIA' || a.estado === 'ADVERTENCIA' || a.estado === 'NORMAL') {
      return a.estado;
    }
    const dias = a.dias_abierto ?? 0;
    const promedio = a.promedio_historico ?? 0;
    if (dias > promedio * 2.0) {
      return 'ANOMALIA';
    }
    if (dias > promedio * 1.5) {
      return 'ADVERTENCIA';
    }
    return 'NORMAL';
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
          this.finalizarCargaPrincipal();
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
                this.finalizarCargaPrincipal();
              }
            },
            error: () => {
              completados++;
              if (completados === requests.length) {
                resultados.sort((a, b) => b.probabilidad - a.probabilidad);
                this.riesgos.set(resultados);
                this.finalizarCargaPrincipal();
              }
            },
          });
        });
      },
      error: () => this.finalizarCargaPrincipal(),
    });
  }
}
