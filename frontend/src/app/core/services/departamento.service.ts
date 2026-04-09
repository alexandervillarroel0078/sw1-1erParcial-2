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
    { id: 'dep-1', nombre: 'Dirección', activo: true },
    { id: 'dep-2', nombre: 'Recursos Humanos', activo: true },
    { id: 'dep-3', nombre: 'Atención al Cliente', activo: true },
    { id: 'dep-4', nombre: 'Soporte Técnico', activo: false },
  ];

  getDepartamentos(): Observable<Departamento[]> {
    // reemplazar con HTTP cuando el backend esté listo
    return of([...this.departamentos]);
  }

  crearDepartamento(dep: Departamento): Observable<Departamento> {
    // reemplazar con HTTP cuando el backend esté listo
    const nuevo: Departamento = { ...dep, id: dep.id ?? uuid() };
    this.departamentos = [nuevo, ...this.departamentos];
    return of(structuredClone(nuevo));
  }

  eliminarDepartamento(id: string): Observable<void> {
    // reemplazar con HTTP cuando el backend esté listo
    this.departamentos = this.departamentos.filter((d) => d.id !== id);
    return of(void 0);
  }
}

