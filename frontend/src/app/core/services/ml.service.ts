import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RiesgoTarea {
  tarea_id: string;
  riesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  probabilidad: number;
  recomendacion: string;
}

export type EstadoAnomalia = 'ANOMALIA' | 'ADVERTENCIA' | 'NORMAL';

export interface TrainingHistory {
  loss: number[];
  val_loss: number[];
  accuracy: number[];
  val_accuracy: number[];
  [key: string]: number[];
}

export interface Anomalia {
  tramite_id: string;
  cliente_nombre: string;
  politica_nombre: string;
  dias_abierto: number;
  promedio_historico: number;
  desviacion: number;
  estado?: EstadoAnomalia;
  es_anomalia: boolean;
}

@Injectable({ providedIn: 'root' })
export class MlService {
  private readonly http = inject(HttpClient);
  private readonly mlUrl = (environment as any).mlUrl || 'http://localhost:8001';

  getRiesgo(tareaId: string, diasAbierto: number, slaMinutos: number, pasoActual: number, totalPasos: number): Observable<RiesgoTarea> {
    return this.http.post<RiesgoTarea>(`${this.mlUrl}/ml/riesgo-demora`, {
      tarea_id: tareaId,
      dias_abierto: diasAbierto,
      sla_minutos: slaMinutos,
      paso_actual: pasoActual,
      total_pasos: totalPasos,
    });
  }

  getAnomalias(): Observable<Anomalia[]> {
    return this.http.get<Anomalia[]>(`${this.mlUrl}/ml/anomalias`);
  }

  getTrainingHistory(): Observable<TrainingHistory> {
    return this.http.get<TrainingHistory>(`${this.mlUrl}/ml/training-history`);
  }
}
