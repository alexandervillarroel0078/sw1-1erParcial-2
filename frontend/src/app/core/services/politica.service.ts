import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import type { FormularioActividad } from '../models/nodo.model';
import type { Nodo } from '../models/politica.model';
import {
  Politica,
  normalizeNodoTipo,
  normalizeOrientacionCalles,
} from '../models/politica.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/politicas`;
  private readonly funcionarioPoliticas = `${environment.apiUrl}/funcionario/politicas`;

  /** SLA positivo desde API (`slaMinutos` o `sla_minutos`, número o string). */
  private static pickSlaMinutos(n: Nodo & Record<string, unknown>): number | undefined {
    const raw = n.slaMinutos ?? n['sla_minutos'];
    if (raw == null || raw === '') return undefined;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
  }

  private mapPolitica(p: Politica): Politica {
    return {
      ...p,
      fechaCreacion:
        p.fechaCreacion != null
          ? typeof p.fechaCreacion === 'string'
            ? new Date(p.fechaCreacion)
            : p.fechaCreacion
          : undefined,
      orientacionCalles:
        p.orientacionCalles != null
          ? normalizeOrientacionCalles(p.orientacionCalles as string)
          : undefined,
      nodos: p.nodos?.map((n) => ({
        ...n,
        tipo: normalizeNodoTipo(n.tipo as string),
        slaMinutos: PoliticaService.pickSlaMinutos(n as Nodo & Record<string, unknown>),
      })),
    };
  }

  getPoliticas(): Observable<Politica[]> {
    return this.http.get<Politica[]>(this.base).pipe(
      map((list) => list.map((x) => this.mapPolitica(x))),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  getPoliticasActivas(): Observable<Politica[]> {
    return this.http
      .get<Politica[]>(`${this.funcionarioPoliticas}/activas`)
      .pipe(
        map((list) => list.map((x) => this.mapPolitica(x))),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }

  getPoliticaById(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.base}/${id}`).pipe(
      map((x) => this.mapPolitica(x)),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of({} as Politica);
        }
        return handleApiError(this.auth, this.snack, err);
      }),
    );
  }

  getFormularioActividad(
    politicaId: string,
    nodoId: string,
  ): Observable<FormularioActividad | null> {
    return this.http
      .get<FormularioActividad>(
        `${this.base}/${politicaId}/nodos/${nodoId}/formulario`,
      )
      .pipe(
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(null);
          }
          return handleApiError(this.auth, this.snack, err);
        }),
      );
  }

  putFormularioActividad(
    politicaId: string,
    nodoId: string,
    body: FormularioActividad,
  ): Observable<FormularioActividad> {
    return this.http
      .put<FormularioActividad>(
        `${this.base}/${politicaId}/nodos/${nodoId}/formulario`,
        body,
      )
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  crearPolitica(politica: Politica): Observable<Politica> {
    const body = {
      nombre: politica.nombre,
      subtitulo: politica.subtitulo,
      colorTema: politica.colorTema,
      activa: politica.activa,
      fechaCreacion: politica.fechaCreacion,
      orientacionCalles:
        politica.orientacionCalles != null
          ? normalizeOrientacionCalles(politica.orientacionCalles as string)
          : undefined,
      nodos: (politica.nodos ?? []).map((n) => ({
        ...n,
        tipo: normalizeNodoTipo(n.tipo as string),
      })),
      aristas: politica.aristas ?? [],
      callesDiseno: politica.callesDiseno ?? [],
    };
    return this.http.post<Politica>(this.base, body).pipe(
      map((x) => this.mapPolitica(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  actualizarPolitica(id: string, politica: Politica): Observable<Politica> {
    const body = {
      ...politica,
      id,
      nodos: (politica.nodos ?? []).map((n) => ({
        ...n,
        tipo: normalizeNodoTipo(n.tipo as string),
      })),
      aristas: politica.aristas ?? [],
      callesDiseno: politica.callesDiseno ?? [],
      orientacionCalles:
        politica.orientacionCalles != null
          ? normalizeOrientacionCalles(politica.orientacionCalles as string)
          : undefined,
    };
    return this.http.put<Politica>(`${this.base}/${id}`, body).pipe(
      map((x) => this.mapPolitica(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  eliminarPolitica(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`)
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  activarDesactivar(id: string): Observable<Politica> {
    return this.http
      .patch<Politica>(`${this.base}/${id}/activar-desactivar`, {})
      .pipe(
        map((x) => this.mapPolitica(x)),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }
}
