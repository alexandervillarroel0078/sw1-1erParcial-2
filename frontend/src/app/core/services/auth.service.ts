import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import {
  LoginRequest,
  LoginResponse,
  Usuario,
} from '../models/usuario.model';

const LS_TOKEN_KEY = 'auth.token';
const LS_USUARIO_KEY = 'auth.usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Inyección lista para cuando agregues Router/HttpClient.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly _injector = inject.bind(null);

  private readonly usuariosMock: Array<Usuario & { password: string }> = [
    {
      id: 'u-admin-1',
      nombre: 'Administrador',
      correo: 'admin@demo.com',
      rol: 'ADMINISTRADOR',
      activo: true,
      creadoEn: new Date('2026-01-10T10:00:00Z'),
      password: 'admin123',
    },
    {
      id: 'u-func-7',
      nombre: 'Funcionario Demo',
      correo: 'funcionario@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-direccion',
      activo: true,
      creadoEn: new Date('2026-01-12T10:00:00Z'),
      password: 'funcionario123',
    },
  ];

  login(request: LoginRequest): Observable<LoginResponse> {
    // reemplazar con HTTP cuando el backend esté listo
    const match = this.usuariosMock.find(
      (u) =>
        u.correo.toLowerCase() === request.correo.toLowerCase() &&
        u.password === request.password &&
        u.activo,
    );

    if (!match) {
      return throwError(() => new Error('Credenciales inválidas'));
    }

    const { password: _pw, ...usuario } = match;
    const token = this.generarTokenMock(usuario);
    const response: LoginResponse = { token, usuario };

    localStorage.setItem(LS_TOKEN_KEY, token);
    localStorage.setItem(LS_USUARIO_KEY, JSON.stringify(usuario));

    return of(response);
  }

  logout(): void {
    // reemplazar con HTTP cuando el backend esté listo (si aplica)
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_USUARIO_KEY);
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
    return Boolean(this.getToken()) && this.getUsuario().activo === true;
  }

  getRol(): string {
    return this.getUsuario().rol;
  }

  private generarTokenMock(usuario: Usuario): string {
    const payload = {
      sub: usuario.id ?? usuario.correo,
      rol: usuario.rol,
      iat: Date.now(),
    };
    return `mock.${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}.token`;
  }
}

