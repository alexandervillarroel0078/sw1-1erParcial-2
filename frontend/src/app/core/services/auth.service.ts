import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  Usuario,
} from '../models/usuario.model';
import { handleApiError } from '../utils/api-error.util';

const LS_TOKEN_KEY = 'dpn_token';
const LS_USUARIO_KEY = 'dpn_usuario';

function loginFailureMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null | undefined;
    if (body?.error) {
      return body.error;
    }
  }
  return 'Credenciales incorrectas';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  login(
    request: LoginRequest,
    rolEsperado?: Usuario['rol'] | null,
  ): Observable<LoginResponse> {
    const url = `${environment.apiUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, request).pipe(
      switchMap((res) => {
        if (!res.usuario) {
          return throwError(
            () => new Error('Este acceso es solo para personal interno.'),
          );
        }
        if (rolEsperado != null && res.usuario.rol !== rolEsperado) {
          return throwError(
            () =>
              new Error(
                'El rol seleccionado no coincide con las credenciales.',
              ),
          );
        }
        localStorage.setItem(LS_TOKEN_KEY, res.token);
        localStorage.setItem(LS_USUARIO_KEY, JSON.stringify(res.usuario));
        const dest =
          res.usuario.rol === 'ADMINISTRADOR'
            ? '/admin/dashboard'
            : '/funcionario/bandeja';
        void this.router.navigateByUrl(dest);
        return of(res);
      }),
      catchError((err) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            this.logout();
          } else if (err.status === 403) {
            this.snack.open('Sin permisos', 'Cerrar', { duration: 5000 });
          }
        }
        if (err instanceof Error && !(err instanceof HttpErrorResponse)) {
          return throwError(() => err);
        }
        return throwError(() => new Error(loginFailureMessage(err)));
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_USUARIO_KEY);
    void this.router.navigateByUrl('/auth/login');
  }

  getToken(): string {
    return localStorage.getItem(LS_TOKEN_KEY) ?? '';
  }

  getUsuario(): Usuario {
    const raw = localStorage.getItem(LS_USUARIO_KEY);
    if (!raw) {
      return {
        nombre: '',
        correo: '',
        rol: 'FUNCIONARIO',
        activo: false,
      };
    }

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return {
        nombre: '',
        correo: '',
        rol: 'FUNCIONARIO',
        activo: false,
      };
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  getRol(): string {
    return this.getUsuario().rol;
  }
}
