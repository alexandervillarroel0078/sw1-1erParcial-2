import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Politica } from '../models/politica.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/politicas`;

  private mapPolitica(p: Politica): Politica {
    return {
      ...p,
      fechaCreacion:
        p.fechaCreacion != null
          ? typeof p.fechaCreacion === 'string'
            ? new Date(p.fechaCreacion)
            : p.fechaCreacion
          : undefined,
    };
  }

  getPoliticas(): Observable<Politica[]> {
    return this.http.get<Politica[]>(this.base).pipe(
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

  crearPolitica(politica: Politica): Observable<Politica> {
    const body = {
      nombre: politica.nombre,
      subtitulo: politica.subtitulo,
      colorTema: politica.colorTema,
      activa: politica.activa,
      fechaCreacion: politica.fechaCreacion,
      orientacionCalles: politica.orientacionCalles,
      nodos: politica.nodos ?? [],
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
      nodos: politica.nodos ?? [],
      aristas: politica.aristas ?? [],
      callesDiseno: politica.callesDiseno ?? [],
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
