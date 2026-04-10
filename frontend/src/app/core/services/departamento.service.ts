import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Departamento } from '../models/departamento.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/departamentos`;

  getDepartamentos(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(this.base).pipe(
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  crearDepartamento(d: Departamento): Observable<Departamento> {
    return this.http
      .post<Departamento>(this.base, {
        nombre: d.nombre.trim(),
        activo: d.activo ?? true,
      })
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  actualizarDepartamento(
    id: string,
    d: Partial<Departamento>,
  ): Observable<Departamento> {
    const body: Record<string, unknown> = {};
    if (d.nombre !== undefined) {
      body['nombre'] = d.nombre.trim();
    }
    if (d.activo !== undefined) {
      body['activo'] = d.activo;
    }
    return this.http
      .put<Departamento>(`${this.base}/${id}`, body)
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  eliminarDepartamento(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`)
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  activarDesactivar(id: string): Observable<Departamento> {
    return this.http
      .patch<Departamento>(`${this.base}/${id}/activar-desactivar`, {})
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }
}
