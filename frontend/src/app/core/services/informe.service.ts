import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Informe } from '../models/informe.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

type InformeApi = Omit<Informe, 'creadoEn' | 'enviadoEn'> & {
  creadoEn?: string;
  enviadoEn?: string | null;
};

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string') return v;
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class InformeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/funcionario/informes`;

  private mapInforme(raw: InformeApi | Record<string, unknown>): Informe {
    const r = raw as Record<string, unknown>;
    const obsRaw = r['observaciones'] ?? r['Observaciones'];
    const observaciones =
      typeof obsRaw === 'string' && obsRaw.trim() !== '' ? obsRaw : undefined;
    const esBorrador = Boolean(r['esBorrador'] ?? r['es_borrador'] ?? false);
    const creadoRaw = r['creadoEn'] ?? r['creado_en'];
    const enviadoRaw = r['enviadoEn'] ?? r['enviado_en'];
    return {
      id: typeof r['id'] === 'string' ? r['id'] : undefined,
      tramiteId: pickStr(r, 'tramiteId', 'tramite_id'),
      tareaId: pickStr(r, 'tareaId', 'tarea_id') || undefined,
      funcionarioId: pickStr(r, 'funcionarioId', 'funcionario_id') || undefined,
      descripcion: pickStr(r, 'descripcion', 'Descripcion'),
      resultado: pickStr(r, 'resultado', 'Resultado'),
      observaciones,
      esBorrador,
      creadoEn:
        creadoRaw != null
          ? typeof creadoRaw === 'string'
            ? new Date(creadoRaw)
            : creadoRaw instanceof Date
              ? creadoRaw
              : undefined
          : undefined,
      enviadoEn:
        enviadoRaw != null
          ? typeof enviadoRaw === 'string'
            ? new Date(enviadoRaw)
            : enviadoRaw instanceof Date
              ? enviadoRaw
              : undefined
          : undefined,
    };
  }

  getInformePorTarea(tareaId: string): Observable<Informe | null> {
    return this.http.get<InformeApi>(`${this.base}/tarea/${tareaId}`).pipe(
      map((x) => this.mapInforme(x)),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return handleApiError(this.auth, this.snack, err);
      }),
    );
  }

  crearInforme(informe: Informe): Observable<Informe> {
    const body: Record<string, unknown> = {
      tramiteId: informe.tramiteId,
      descripcion: informe.descripcion,
      resultado: informe.resultado,
      esBorrador: informe.esBorrador,
    };
    if (informe.tareaId) {
      body['tareaId'] = informe.tareaId;
    }
    if (informe.observaciones?.trim()) {
      body['observaciones'] = informe.observaciones.trim();
    }
    return this.http.post<InformeApi>(this.base, body).pipe(
      map((x) => this.mapInforme(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }
}
