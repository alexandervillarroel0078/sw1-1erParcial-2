import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Tarea } from '../models/tarea.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

type TareaApi = Omit<Tarea, 'estado'> & {
  estado?: string;
  completadoEn?: string;
};

const ESTADO_TAREA: Record<string, Tarea['estado']> = {
  PENDIENTE: 'pendiente',
  EN_ATENCION: 'en_atencion',
  COMPLETADO: 'completado',
  pendiente: 'pendiente',
  en_atencion: 'en_atencion',
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

  completarTarea(id: string): Observable<Tarea> {
    return this.http
      .patch<TareaApi>(`${this.base}/${id}`, { accion: 'COMPLETAR' })
      .pipe(
        map((x) => this.mapTarea(x)),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }
}
