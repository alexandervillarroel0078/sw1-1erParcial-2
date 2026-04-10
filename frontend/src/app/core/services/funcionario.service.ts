import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class FuncionarioService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/usuarios`;

  private mapUsuario(u: Usuario): Usuario {
    return {
      ...u,
      creadoEn:
        u.creadoEn != null
          ? typeof u.creadoEn === 'string'
            ? new Date(u.creadoEn)
            : u.creadoEn
          : undefined,
    };
  }

  getFuncionarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.base).pipe(
      map((list) => list.map((x) => this.mapUsuario(x))),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  crearFuncionario(u: Usuario): Observable<Usuario> {
    const body = {
      nombre: u.nombre,
      correo: u.correo,
      password: u.password ?? '',
      rol: u.rol,
      departamentoId: u.departamentoId,
      activo: u.activo ?? true,
    };
    return this.http.post<Usuario>(this.base, body).pipe(
      map((x) => this.mapUsuario(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  actualizarFuncionario(id: string, u: Usuario): Observable<Usuario> {
    const body: Record<string, unknown> = {
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      departamentoId: u.departamentoId,
      activo: u.activo,
    };
    if (u.password != null && u.password !== '') {
      body['password'] = u.password;
    }
    return this.http.put<Usuario>(`${this.base}/${id}`, body).pipe(
      map((x) => this.mapUsuario(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  eliminarFuncionario(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`)
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }
}
