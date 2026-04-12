import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import type { OpcionDecision } from '../models/tarea.model';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Tarea } from '../models/tarea.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

type TareaApi = Omit<Tarea, 'estado'> & {
  estado?: string;
  completadoEn?: string;
  requiereDecision?: boolean;
  condicionDecision?: string | null;
  opcionesDecision?: OpcionDecision[];
};

const ESTADO_TAREA: Record<string, Tarea['estado']> = {
  PENDIENTE: 'pendiente',
  EN_ATENCION: 'en_atencion',
  DEMORADO: 'demorado',
  COMPLETADO: 'completado',
  pendiente: 'pendiente',
  en_atencion: 'en_atencion',
  demorado: 'demorado',
  completado: 'completado',
};

@Injectable({ providedIn: 'root' })
export class TareaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/funcionario/tareas`;
  private readonly adminBase = `${environment.apiUrl}/admin/tareas`;

  private mapTarea(raw: TareaApi): Tarea {
    const estadoKey = (raw.estado ?? 'PENDIENTE').toString();
    const estado = ESTADO_TAREA[estadoKey] ?? 'pendiente';
    const { completadoEn, ...rest } = raw;
    const completadoA =
      completadoEn != null
        ? typeof completadoEn === 'string'
          ? completadoEn
          : new Date(completadoEn).toISOString()
        : rest.completadoA;
    return {
      ...rest,
      estado,
      completadoA,
      requiereDecision: raw.requiereDecision === true,
      condicionDecision: raw.condicionDecision ?? undefined,
      opcionesDecision: raw.opcionesDecision,
    };
  }

  getMisTareas(): Observable<Tarea[]> {
    return this.http.get<TareaApi[]>(`${this.base}/mias`).pipe(
      map((list) => list.map((x) => this.mapTarea(x))),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  getTareas(): Observable<Tarea[]> {
    return this.http.get<TareaApi[]>(this.adminBase).pipe(
      map((list) => list.map((x) => this.mapTarea(x))),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  getTareaById(id: string): Observable<Tarea | null> {
    return this.http.get<TareaApi>(`${this.base}/${id}`).pipe(
      map((x) => this.mapTarea(x)),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return handleApiError(this.auth, this.snack, err);
      }),
    );
  }

  atenderTarea(id: string): Observable<Tarea> {
    return this.http
      .patch<TareaApi>(`${this.base}/${id}`, { accion: 'ATENDER' })
      .pipe(
        map((x) => this.mapTarea(x)),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }

  completarTarea(
    id: string,
    ramaDecision?: string | null,
  ): Observable<Tarea> {
    const body: Record<string, unknown> = { accion: 'COMPLETAR' };
    if (ramaDecision !== undefined) {
      body['ramaDecision'] = ramaDecision;
    }
    return this.http.patch<TareaApi>(`${this.base}/${id}`, body).pipe(
      map((x) => this.mapTarea(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  decidirRama(id: string, rama: string): Observable<Tarea> {
    return this.http
      .patch<TareaApi>(`${this.base}/${id}`, {
        accion: 'DECIDIR',
        ramaDecision: rama,
      })
      .pipe(
        map((x) => this.mapTarea(x)),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }
}
