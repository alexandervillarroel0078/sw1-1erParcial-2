import { NgClass } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  BarController,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  BarController,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IaService, ConsultaReporteResponse, ComparacionPeriodosResponse } from '../../core/services/ia.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div style="padding: 24px; max-width: 1100px;">
      <h2 style="margin-bottom: 4px;">Reportes por lenguaje natural</h2>
      <p style="color: #666; margin-bottom: 24px; font-size: 14px;">
        Describe en texto libre qué información necesitas y el sistema generará el reporte automáticamente.
      </p>

      <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 24px;">
        <mat-form-field style="flex: 1;" appearance="outline">
          <mat-label>¿Qué reporte necesitas?</mat-label>
          <textarea
            matInput
            [(ngModel)]="consulta"
            rows="3"
            placeholder='Ej: "Muéstrame los trámites completados esta semana" o "Tareas demoradas por departamento"'
          ></textarea>
        </mat-form-field>
        <button mat-icon-button type="button" color="primary"
          [class.active]="escuchandoReporte()"
          (click)="iniciarVozReporte()"
          matTooltip="{{ escuchandoReporte() ? 'Detener' : 'Consulta por voz' }}">
          <mat-icon>{{ escuchandoReporte() ? 'mic' : 'mic_none' }}</mat-icon>
        </button>
        <button
          mat-flat-button
          color="primary"
          style="margin-top: 4px; height: 56px; min-width: 130px;"
          [disabled]="cargando() || consulta.trim().length < 3"
          (click)="generarReporte()"
        >
          @if (cargando()) {
            <mat-spinner diameter="20" style="display:inline-block;margin-right:8px;"></mat-spinner>
            Generando...
          } @else {
            <ng-container>
              <mat-icon>search</mat-icon>
              Generar
            </ng-container>
          }
        </button>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
        @for (s of sugerencias; track s) {
          <button mat-stroked-button style="font-size: 13px; border-radius: 20px;" (click)="usarSugerencia(s)">
            <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:4px;">lightbulb_outline</mat-icon>
            {{ s }}
          </button>
        }
      </div>

      @if (resultado()) {
        <div style="margin-bottom: 12px;">
          <strong>{{ resultado()!.descripcion }}</strong>
          <span style="color: #666; font-size: 13px; margin-left: 12px;">
            {{ resultado()!.total }} resultado(s)
          </span>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button mat-stroked-button (click)="exportarCSV()">
            <mat-icon>download</mat-icon> CSV
          </button>
          <button mat-stroked-button (click)="exportarPDF()">
            <mat-icon>picture_as_pdf</mat-icon> PDF
          </button>
          <button mat-stroked-button (click)="exportarExcel()">
            <mat-icon>table_view</mat-icon> Excel
          </button>
        </div>

        @if (resultado()?.tipoGrafico && datosGrafico().length > 0) {
          <div style="margin: 24px 0;">
            @if (resultado()?.tipoGrafico === 'pie') {
              <div style="height: 300px; position: relative;">
                <canvas #graficoCanvas></canvas>
              </div>
            }
            @if (resultado()?.tipoGrafico === 'bar') {
              <div style="height: 300px; position: relative;">
                <canvas #graficoCanvas></canvas>
              </div>
            }
            @if (resultado()?.tipoGrafico === 'line') {
              <div style="height: 300px; position: relative;">
                <canvas #graficoCanvas></canvas>
              </div>
            }
          </div>
        }

        @if (resultado()!.filas.length > 0) {
          <div style="overflow-x: auto;">
            <table mat-table [dataSource]="resultado()!.filas" style="width: 100%;">
              @for (col of resultado()!.columnas; track col) {
                <ng-container [matColumnDef]="col">
                  <th mat-header-cell *matHeaderCellDef style="font-weight: 600;">
                    {{ formatearColumna(col) }}
                  </th>
                  <td mat-cell *matCellDef="let row">
                    <span [ngClass]="{
                      'estado-completado': col === 'estado' && row[col] === 'COMPLETADO',
                      'estado-demorado': col === 'estado' && row[col] === 'DEMORADO',
                      'estado-iniciado': col === 'estado' && row[col] === 'INICIADO',
                      'estado-en-proceso': col === 'estado' && row[col] === 'EN_PROCESO'
                    }">{{ formatearValor(col, row[col]) }}</span>
                  </td>
                </ng-container>
              }
              <tr mat-header-row *matHeaderRowDef="resultado()!.columnas"></tr>
              <tr mat-row *matRowDef="let row; columns: resultado()!.columnas;"></tr>
            </table>
          </div>
        } @else {
          <p style="color: #666; text-align: center; padding: 32px;">
            No se encontraron resultados para esta consulta.
          </p>
        }
      }

      @if (comparacion()) {
        <div style="margin-bottom: 16px;">
          <strong style="font-size: 16px;">{{ comparacion()!.descripcion }}</strong>
        </div>

        <div style="margin-bottom: 24px;">
          <canvas #graficoComparacion style="width:100%; max-height:250px; display:block;"></canvas>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; overflow-x: auto; min-width: 0;">
          @for (periodo of [comparacion()!.periodo1, comparacion()!.periodo2]; track periodo.label) {
            <div>
              <h3 style="margin-bottom: 8px; color: #2563eb;">
                {{ periodo.label }}
                <span style="font-size: 13px; color: #666; font-weight: normal;">
                  ({{ periodo.total }} resultados)
                </span>
              </h3>
              @if (periodo.filas.length > 0) {
                <div style="overflow-x: auto; max-width: 100%;">
                  <table mat-table [dataSource]="periodo.filas" style="width: 100%;">
                    @for (col of periodo.columnas; track col) {
                      <ng-container [matColumnDef]="col">
                        <th mat-header-cell *matHeaderCellDef style="font-weight: 600; font-size: 12px;">
                          {{ formatearColumna(col) }}
                        </th>
                        <td mat-cell *matCellDef="let row" style="font-size: 12px;">
                          <span [ngClass]="{
                            'estado-completado': col === 'estado' && row[col] === 'COMPLETADO',
                            'estado-demorado': col === 'estado' && row[col] === 'DEMORADO',
                            'estado-iniciado': col === 'estado' && row[col] === 'INICIADO',
                            'estado-en-proceso': col === 'estado' && row[col] === 'EN_PROCESO'
                          }">{{ formatearValor(col, row[col]) }}</span>
                        </td>
                      </ng-container>
                    }
                    <tr mat-header-row *matHeaderRowDef="periodo.columnas"></tr>
                    <tr mat-row *matRowDef="let row; columns: periodo.columnas;"></tr>
                  </table>
                </div>
              } @else {
                <p style="color: #666; font-size: 13px;">Sin datos para este período.</p>
              }
            </div>
          }
        </div>
      }
    </div>
    <style>
      .estado-completado { color: #16a34a; font-weight: 600; }
      .estado-demorado { color: #dc2626; font-weight: 600; }
      .estado-iniciado { color: #2563eb; font-weight: 600; }
      .estado-en-proceso { color: #d97706; font-weight: 600; }
    </style>
  `,
})
export class ReportesComponent {
  private readonly iaService = inject(IaService);
  private readonly snack = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const res = this.resultado();
      const comp = this.comparacion();
      if (res || comp) {
        setTimeout(() => this.actualizarGrafico(), 200);
      }
    });
  }

  consulta = '';
  sugerencias = [
    'Trámites atendidos esta semana por departamento',
    'Trámites con más demora en los últimos 30 días',
    'Clientes con más trámites activos este mes',
    'Resumen de trámites completados vs pendientes',
    'Funcionarios con mayor carga de trabajo',
  ];

  usarSugerencia(s: string): void {
    this.consulta = s;
  }

  readonly cargando = signal(false);
  readonly resultado = signal<ConsultaReporteResponse | null>(null);
  readonly comparacion = signal<ComparacionPeriodosResponse | null>(null);
  readonly cargandoComparacion = signal(false);
  readonly escuchandoReporte = signal(false);
  private recognitionReporte: any = null;
  readonly COLORES = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];
  private chartInstance: Chart | null = null;
  private lastChartKey = '';
  readonly graficoCanvas = viewChild<ElementRef<HTMLCanvasElement>>('graficoCanvas');
  readonly graficoComparacionRef = viewChild<ElementRef>('graficoComparacion');

  formatearColumna(col: string): string {
    const mapa: Record<string, string> = {
      politica_nombre: 'Política',
      cliente_nombre: 'Cliente',
      estado: 'Estado',
      es_paralelo: 'Paralelo',
      actividad_actual: 'Actividad actual',
      paso_actual: 'Paso actual',
      total_pasos: 'Total pasos',
      creado_en: 'Fecha creación',
      actualizado_en: 'Última actualización',
      completado_en: 'Fecha completado',
      departamento_texto: 'Departamento',
      actividad_etiqueta: 'Actividad',
      dias_abierto: 'Días abierto',
      politica_id: 'ID Política',
      cliente_id: 'ID Cliente',
    };
    return mapa[col] ?? col;
  }

  datosGrafico(): { nombre: string; valor: number }[] {
    const res = this.resultado();
    if (!res || !res.campoGrafico) return [];
    const conteo: Record<string, number> = {};
    for (const fila of res.filas) {
      const clave = String(fila[res.campoGrafico] ?? 'Sin dato');
      conteo[clave] = (conteo[clave] ?? 0) + 1;
    }
    return Object.entries(conteo).map(([nombre, valor]) => ({ nombre, valor }));
  }

  private actualizarGrafico(): void {
    // Gráfico de reporte normal
    const res = this.resultado();
    const canvas = this.graficoCanvas()?.nativeElement;
    if (res?.tipoGrafico && res.campoGrafico && canvas) {
      const datos = this.datosGrafico();
      if (datos.length > 0) {
        const key = `${res.tipoGrafico}|${JSON.stringify(datos)}`;
        if (key !== this.lastChartKey || !this.chartInstance) {
          this.lastChartKey = key;
          this.chartInstance?.destroy();
          const labels = datos.map((d) => d.nombre);
          const values = datos.map((d) => d.valor);
          const colors = datos.map((_, i) => this.COLORES[i % this.COLORES.length]);
          this.chartInstance = new Chart(canvas, {
            type: res.tipoGrafico as any,
            data: {
              labels,
              datasets: [{
                data: values,
                backgroundColor: res.tipoGrafico === 'pie' ? colors : '#2563eb',
                borderColor: res.tipoGrafico === 'line' ? '#2563eb' : undefined,
              }],
            },
            options: { responsive: true, maintainAspectRatio: false },
          });
        }
      }
    }

    // Gráfico comparativo
    const comp = this.comparacion();
    if (!comp) return;
    const canvasComp = this.graficoComparacionRef()?.nativeElement as HTMLCanvasElement;
    if (!canvasComp) {
      setTimeout(() => this.actualizarGrafico(), 100);
      return;
    }
    const campo = comp.campoComparacion;
    const conteo1 = this.conteosPorCampo(comp.periodo1.filas, campo);
    const conteo2 = this.conteosPorCampo(comp.periodo2.filas, campo);
    const labels = [...new Set([...Object.keys(conteo1), ...Object.keys(conteo2)])];
    if ((canvasComp as any).__chartInstance) {
      (canvasComp as any).__chartInstance.destroy();
      delete (canvasComp as any).__chartInstance;
    }
    (canvasComp as any).__chartInstance = new Chart(canvasComp, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: comp.periodo1.label,
            data: labels.map(l => conteo1[l] ?? 0),
            backgroundColor: '#2563eb',
          },
          {
            label: comp.periodo2.label,
            data: labels.map(l => conteo2[l] ?? 0),
            backgroundColor: '#16a34a',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  conteosPorCampo(filas: Record<string, unknown>[], campo: string): Record<string, number> {
    const conteo: Record<string, number> = {};
    for (const fila of filas) {
      const clave = String(fila[campo] ?? 'Sin dato');
      conteo[clave] = (conteo[clave] ?? 0) + 1;
    }
    return conteo;
  }

  formatearValor(col: string, valor: unknown): string {
    if (valor === null || valor === undefined) return '—';
    if (col === 'es_paralelo') return valor ? 'Sí' : 'No';
    if (col.endsWith('_en') && typeof valor === 'string' && valor.includes('T')) {
      const fecha = new Date(valor);
      return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return String(valor);
  }

  exportarCSV(): void {
    const res = this.resultado();
    if (!res || res.filas.length === 0) return;
    const encabezados = res.columnas.map(c => this.formatearColumna(c)).join(',');
    const filas = res.filas.map(fila =>
      res.columnas.map(col => {
        const val = this.formatearValor(col, fila[col]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [encabezados, ...filas].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarPDF(): void {
    const res = this.resultado();
    if (!res || res.filas.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(res.descripcion, 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total: ${res.total} resultado(s)  —  ${new Date().toLocaleDateString('es-BO')}`, 14, 23);
    const encabezados = res.columnas.map(c => this.formatearColumna(c));
    const filas = res.filas.map(fila =>
      res.columnas.map(col => this.formatearValor(col, fila[col]))
    );
    autoTable(doc, {
      head: [encabezados],
      body: filas,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`reporte-${Date.now()}.pdf`);
  }

  exportarExcel(): void {
    const res = this.resultado();
    if (!res || res.filas.length === 0) return;
    const datos = res.filas.map(fila =>
      Object.fromEntries(
        res.columnas.map(col => [this.formatearColumna(col), this.formatearValor(col, fila[col])])
      )
    );
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte-${Date.now()}.xlsx`);
  }

  iniciarVozReporte(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.snack.open('Tu navegador no soporta reconocimiento de voz', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.escuchandoReporte()) {
      this.recognitionReporte?.stop();
      this.escuchandoReporte.set(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    this.escuchandoReporte.set(true);
    rec.onresult = (event: any) => {
      this.consulta = event.results[0][0].transcript;
      this.escuchandoReporte.set(false);
      this.generarReporte();
    };
    rec.onerror = () => {
      this.escuchandoReporte.set(false);
      this.snack.open('Error al capturar voz', 'Cerrar', { duration: 3000 });
    };
    rec.onend = () => this.escuchandoReporte.set(false);
    this.recognitionReporte = rec;
    rec.start();
  }

  esComparacion(texto: string): boolean {
    const keywords = ['vs', 'versus', 'compara', 'comparar', 'diferencia entre', 'contra'];
    return keywords.some(k => texto.toLowerCase().includes(k));
  }

  generarReporte(): void {
    if (this.consulta.trim().length < 3) return;
    this.resultado.set(null);
    this.comparacion.set(null);

    if (this.esComparacion(this.consulta)) {
      this.cargandoComparacion.set(true);
      this.iaService.compararPeriodos(this.consulta.trim()).subscribe({
        next: (res) => {
          this.comparacion.set(res);
          this.cargandoComparacion.set(false);
        },
        error: () => {
          this.cargandoComparacion.set(false);
          this.snack.open('No se pudo comparar. Intente de nuevo.', 'Cerrar', { duration: 4000 });
        },
      });
      return;
    }

    this.cargando.set(true);
    this.iaService.consultaReporte(this.consulta.trim()).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.snack.open('No se pudo generar el reporte. Intente de nuevo.', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
