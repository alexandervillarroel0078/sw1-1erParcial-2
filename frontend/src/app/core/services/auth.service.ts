import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  Usuario,
} from '../models/usuario.model';

const LS_TOKEN_KEY = 'dpn_token';
const LS_USUARIO_KEY = 'dpn_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  login(request: LoginRequest): Observable<LoginResponse> {
    const url = `${environment.apiUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, request).pipe(
      tap((res) => {
        localStorage.setItem(LS_TOKEN_KEY, res.token);
        localStorage.setItem(LS_USUARIO_KEY, JSON.stringify(res.usuario));
      }),
      catchError(() =>
        throwError(() => new Error('Credenciales incorrectas')),
      ),
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
