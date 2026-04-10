import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Departamento } from '../models/departamento.model';

function uuid(): string {
  // reemplazar con IDs del backend cuando esté listo
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private departamentos: Departamento[] = [
    { id: 'dep-atencion', nombre: 'Atención al Cliente', activo: true },
    { id: 'dep-validacion', nombre: 'Validación Técnica', activo: true },
    { id: 'dep-juridico', nombre: 'Jurídico', activo: true },
    { id: 'dep-direccion', nombre: 'Dirección', activo: true },
    { id: 'dep-soporte', nombre: 'Soporte', activo: true },
  ];

  getDepartamentos(): Observable<Departamento[]> {
    return of([...this.departamentos]);
  }

  crearDepartamento(d: Departamento): Observable<Departamento> {
    const nuevo: Departamento = {
      nombre: d.nombre.trim(),
      activo: d.activo ?? true,
      id: d.id ?? uuid(),
    };
    this.departamentos = [nuevo, ...this.departamentos];
    return of(structuredClone(nuevo));
  }

  actualizarDepartamento(id: string, d: Partial<Departamento>): Observable<Departamento> {
    const idx = this.departamentos.findIndex((x) => x.id === id);
    if (idx < 0) {
      return of({
        id,
        nombre: (d.nombre ?? '').trim(),
        activo: d.activo ?? true,
      });
    }
    const prev = this.departamentos[idx];
    const actualizado: Departamento = {
      ...prev,
      ...d,
      id,
      nombre: d.nombre !== undefined ? d.nombre.trim() : prev.nombre,
    };
    this.departamentos = this.departamentos.map((x) => (x.id === id ? actualizado : x));
    return of(structuredClone(actualizado));
  }

  eliminarDepartamento(id: string): Observable<void> {
    this.departamentos = this.departamentos.filter((d) => d.id !== id);
    return of(void 0);
  }

  activarDesactivar(id: string): Observable<Departamento> {
    const dep = this.departamentos.find((d) => d.id === id);
    if (!dep) {
      return of({ id, nombre: '', activo: false });
    }
    const actualizado: Departamento = { ...dep, activo: !dep.activo };
    this.departamentos = this.departamentos.map((x) => (x.id === id ? actualizado : x));
    return of(structuredClone(actualizado));
  }
}
