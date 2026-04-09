import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Usuario } from '../models/usuario.model';

function uuid(): string {
  // reemplazar con IDs del backend cuando esté listo
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

@Injectable({ providedIn: 'root' })
export class FuncionarioService {
  private funcionarios: Usuario[] = [
    {
      id: 'u-func-1',
      nombre: 'Funcionario Demo',
      correo: 'funcionario@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-2',
      activo: true,
      creadoEn: new Date('2026-01-12T10:00:00Z'),
    },
    {
      id: 'u-func-2',
      nombre: 'Ana Pérez',
      correo: 'ana.perez@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-3',
      activo: true,
      creadoEn: new Date('2026-02-05T10:00:00Z'),
    },
    {
      id: 'u-func-3',
      nombre: 'Luis Gómez',
      correo: 'luis.gomez@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-4',
      activo: false,
      creadoEn: new Date('2026-02-20T10:00:00Z'),
    },
  ];

  getFuncionarios(): Observable<Usuario[]> {
    // reemplazar con HTTP cuando el backend esté listo
    return of([...this.funcionarios]);
  }

  crearFuncionario(u: Usuario): Observable<Usuario> {
    // reemplazar con HTTP cuando el backend esté listo
    const nuevo: Usuario = {
      ...u,
      id: u.id ?? uuid(),
      rol: u.rol ?? 'FUNCIONARIO',
      activo: u.activo ?? true,
      creadoEn: u.creadoEn ?? new Date(),
    };
    this.funcionarios = [nuevo, ...this.funcionarios];
    return of(structuredClone(nuevo));
  }

  actualizarFuncionario(id: string, u: Usuario): Observable<Usuario> {
    // reemplazar con HTTP cuando el backend esté listo
    const idx = this.funcionarios.findIndex((x) => x.id === id);
    const prev = idx >= 0 ? this.funcionarios[idx] : ({} as Usuario);
    const actualizado: Usuario = {
      ...prev,
      ...u,
      id,
      rol: u.rol ?? prev.rol ?? 'FUNCIONARIO',
    };
    if (idx >= 0) {
      this.funcionarios = this.funcionarios.map((x) => (x.id === id ? actualizado : x));
    } else {
      this.funcionarios = [actualizado, ...this.funcionarios];
    }
    return of(structuredClone(actualizado));
  }

  eliminarFuncionario(id: string): Observable<void> {
    // reemplazar con HTTP cuando el backend esté listo
    this.funcionarios = this.funcionarios.filter((x) => x.id !== id);
    return of(void 0);
  }
}

