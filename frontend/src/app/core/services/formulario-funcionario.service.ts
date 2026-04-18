import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import type { FormularioActividad } from '../models/nodo.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class FormularioFuncionarioService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/funcionario/formulario`;

  obtener(politicaId: string, nodoId: string): Observable<FormularioActividad | null> {
    const params = new HttpParams()
      .set('politicaId', politicaId)
      .set('nodoId', nodoId);
    return this.http.get<FormularioActividad>(this.base, { params }).pipe(
      tap((res) => {
        console.log('[FormularioFuncionarioService][TEMP] GET', {
          url: `${this.base}?${params.toString()}`,
          politicaId,
          nodoId,
          respuesta: res,
        });
      }),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return handleApiError(this.auth, this.snack, err);
      }),
    );
  }
}
