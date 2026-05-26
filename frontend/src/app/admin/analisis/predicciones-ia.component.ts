import { NgClass } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Tarea } from '../../core/models/tarea.model';
import { Anomalia, MlService, RiesgoTarea } from '../../core/services/ml.service';
import { TareaService } from '../../core/services/tarea.service';
import type { Observable } from 'rxjs';

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

        <!-- Resumen de riesgos -->
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px;">
          <mat-card appearance="outlined" style="padding:16px; border-left:4px solid #dc2626;">
            <div style="font-size:13px; color:#666;">Riesgo ALTO</div>
            <div style="font-size:28px; font-weight:700; color:#dc2626;">{{ contarRiesgo('ALTO') }}</div>
            <div style="font-size:11px; color:#999;">tareas críticas</div>
          </mat-card>
          <mat-card appearance="outlined" style="padding:16px; border-left:4px solid #d97706;">
            <div style="font-size:13px; color:#666;">Riesgo MEDIO</div>
            <div style="font-size:28px; font-weight:700; color:#d97706;">{{ contarRiesgo('MEDIO') }}</div>
            <div style="font-size:11px; color:#999;">tareas a revisar</div>
          </mat-card>
          <mat-card appearance="outlined" style="padding:16px; border-left:4px solid #16a34a;">
            <div style="font-size:13px; color:#666;">Riesgo BAJO</div>
            <div style="font-size:28px; font-weight:700; color:#16a34a;">{{ contarRiesgo('BAJO') }}</div>
            <div style="font-size:11px; color:#999;">tareas en tiempo</div>
          </mat-card>
        </div>

        <!-- Tareas con riesgo -->
        @if (riesgos().length > 0) {
          <h3 style="font-size:15px; font-weight:600; margin-bottom:12px;">Análisis de riesgo por tarea</h3>
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px;">
            @for (r of riesgos(); track r.tarea_id) {
              <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
                <span [ngClass]="{
                  'badge-alto': r.riesgo === 'ALTO',
                  'badge-medio': r.riesgo === 'MEDIO',
                  'badge-bajo': r.riesgo === 'BAJO'
                }" style="padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700;">
                  {{ r.riesgo }}
                </span>
                <div style="flex:1; font-size:13px; color:#374151;">{{ r.recomendacion }}</div>
                <div style="font-size:12px; color:#9ca3af;">{{ (r.probabilidad * 100).toFixed(0) }}%</div>
              </div>
            }
          </div>
        }

        <!-- Anomalías -->
        <h3 style="font-size:15px; font-weight:600; margin-bottom:12px;">
          <mat-icon style="vertical-align:middle; font-size:18px; color:#f59e0b;">warning</mat-icon>
          Detección de anomalías
        </h3>
        <div style="overflow-x:auto;">
          <table mat-table [dataSource]="anomalias()" style="width:100%;">
            <ng-container matColumnDef="cliente">
              <th mat-header-cell *matHeaderCellDef>Cliente</th>
              <td mat-cell *matCellDef="let a">{{ a.cliente_nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="politica">
              <th mat-header-cell *matHeaderCellDef>Política</th>
              <td mat-cell *matCellDef="let a">{{ a.politica_nombre }}</td>
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
                  <span style="color:#dc2626; font-weight:700;">⚠️ SÍ</span>
                } @else {
                  <span style="color:#16a34a;">✓ Normal</span>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['cliente','politica','dias','promedio','anomalia']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['cliente','politica','dias','promedio','anomalia'];"></tr>
          </table>
        </div>
      }
    </div>

    <style>
      .badge-alto { background: #fee2e2; color: #dc2626; }
      .badge-medio { background: #fef3c7; color: #d97706; }
      .badge-bajo { background: #dcfce7; color: #16a34a; }
    </style>
  `,
})
export class PrediccionesIaComponent implements OnInit {
  private readonly mlService = inject(MlService);
  private readonly tareaService = inject(TareaService);

  readonly cargando = signal(false);
  readonly riesgos = signal<RiesgoTarea[]>([]);
  readonly anomalias = signal<Anomalia[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.mlService.getAnomalias().subscribe({
      next: (anomalias) => {
        this.anomalias.set(anomalias);
        this.cargarRiesgos();
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarRiesgos(): void {
    this.tareaService.getTareas().subscribe({
      next: (tareas: Tarea[]) => {
        const pendientes = tareas.filter((t) => t.estado !== 'completado');
        if (!pendientes.length) {
          this.cargando.set(false);
          return;
        }
        const requests: Observable<RiesgoTarea>[] = pendientes.slice(0, 10).map((t) =>
          this.mlService.getRiesgo(
            t.id ?? '',
            t.diasAbierto ?? 0,
            1440,
            t.pasoActual ?? 0,
            t.totalPasos ?? 1
          )
        );
        let completados = 0;
        const resultados: RiesgoTarea[] = [];
        requests.forEach((req) => {
          req.subscribe({
            next: (r: RiesgoTarea) => {
              resultados.push(r);
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
                this.riesgos.set(resultados);
                this.cargando.set(false);
              }
            }
          });
        });
      },
      error: () => this.cargando.set(false),
    });
  }

  contarRiesgo(nivel: string): number {
    return this.riesgos().filter(r => r.riesgo === nivel).length;
  }
}
