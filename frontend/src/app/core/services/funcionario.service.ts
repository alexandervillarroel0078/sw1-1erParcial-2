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
      id: 'u-func-10',
      nombre: 'Laura Méndez',
      correo: 'laura.mendez@demo.com',
      rol: 'ADMINISTRADOR',
      activo: true,
      creadoEn: new Date('2026-01-05T10:00:00Z'),
    },
    // Atención al Cliente (3)
    {
      id: 'u-func-1',
      nombre: 'María López',
      correo: 'maria.lopez@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-atencion',
      activo: true,
      creadoEn: new Date('2026-01-10T10:00:00Z'),
    },
    {
      id: 'u-func-2',
      nombre: 'Ana Pérez',
      correo: 'ana.perez@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-atencion',
      activo: true,
      creadoEn: new Date('2026-02-05T10:00:00Z'),
    },
    {
      id: 'u-func-3',
      nombre: 'Carlos Ruiz',
      correo: 'carlos.ruiz@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-atencion',
      activo: true,
      creadoEn: new Date('2026-02-12T10:00:00Z'),
    },
    // Validación Técnica (2)
    {
      id: 'u-func-4',
      nombre: 'Luis Gómez',
      correo: 'luis.gomez@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-validacion',
      activo: true,
      creadoEn: new Date('2026-02-20T10:00:00Z'),
    },
    {
      id: 'u-func-5',
      nombre: 'Patricia Vega',
      correo: 'patricia.vega@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-validacion',
      activo: false,
      creadoEn: new Date('2026-03-01T10:00:00Z'),
    },
    // Jurídico (1)
    {
      id: 'u-func-6',
      nombre: 'Roberto Díaz',
      correo: 'roberto.diaz@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-juridico',
      activo: true,
      creadoEn: new Date('2026-01-22T10:00:00Z'),
    },
    // Dirección (1)
    {
      id: 'u-func-7',
      nombre: 'Funcionario Demo',
      correo: 'funcionario@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-direccion',
      activo: true,
      creadoEn: new Date('2026-01-12T10:00:00Z'),
    },
    // Soporte (2)
    {
      id: 'u-func-8',
      nombre: 'Sofía Herrera',
      correo: 'sofia.herrera@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-soporte',
      activo: true,
      creadoEn: new Date('2026-03-08T10:00:00Z'),
    },
    {
      id: 'u-func-9',
      nombre: 'Diego Morales',
      correo: 'diego.morales@demo.com',
      rol: 'FUNCIONARIO',
      departamentoId: 'dep-soporte',
      activo: true,
      creadoEn: new Date('2026-03-15T10:00:00Z'),
    },
  ];

  getFuncionarios(): Observable<Usuario[]> {
    return of([...this.funcionarios]);
  }

  crearFuncionario(u: Usuario): Observable<Usuario> {
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
    this.funcionarios = this.funcionarios.filter((x) => x.id !== id);
    return of(void 0);
  }
}
