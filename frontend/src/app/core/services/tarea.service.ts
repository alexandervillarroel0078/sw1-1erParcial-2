import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Tarea } from '../models/tarea.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private readonly auth = inject(AuthService);

  private tareas: Tarea[] = [
    {
      id: 'tar-1',
      tramiteId: 'tra-1',
      nodoFlujoId: 'n2',
      actividadEtiqueta: 'Revisar solicitud',
      departamentoTexto: 'Recursos Humanos',
      politicaNombre: 'Aprobación de Vacaciones',
      pasoActual: 2,
      totalPasos: 4,
      clienteNombre: 'María López',
      diasAbierto: 2,
      transcurrido: '2 días',
      usuarioAsignadoId: 'u-func-1',
      estado: 'pendiente',
    },
    {
      id: 'tar-2',
      tramiteId: 'tra-2',
      nodoFlujoId: 'r4',
      actividadEtiqueta: 'Análisis técnico',
      departamentoTexto: 'Soporte Técnico',
      politicaNombre: 'Reclamo y Resolución',
      pasoActual: 3,
      totalPasos: 6,
      clienteNombre: 'Carlos Pérez',
      diasAbierto: 6,
      transcurrido: '6 días',
      usuarioAsignadoId: 'u-func-2',
      estado: 'en_atencion',
    },
    {
      id: 'tar-3',
      tramiteId: 'tra-2',
      nodoFlujoId: 'r5',
      actividadEtiqueta: 'Contacto con cliente',
      departamentoTexto: 'Atención al Cliente',
      politicaNombre: 'Reclamo y Resolución',
      pasoActual: 3,
      totalPasos: 6,
      clienteNombre: 'Carlos Pérez',
      diasAbierto: 6,
      transcurrido: '6 días',
      usuarioAsignadoId: 'u-func-1',
      estado: 'pendiente',
    },
    {
      id: 'tar-4',
      tramiteId: 'tra-3',
      nodoFlujoId: 'a2',
      actividadEtiqueta: 'Capturar datos',
      departamentoTexto: 'Atención al Cliente',
      politicaNombre: 'Alta de Cliente',
      pasoActual: 3,
      totalPasos: 3,
      clienteNombre: 'María López',
      diasAbierto: 0,
      transcurrido: 'Completado',
      usuarioAsignadoId: 'u-func-1',
      estado: 'completado',
      completadoA: new Date('2026-04-01T12:00:00Z').toISOString(),
      duracion: '3 días',
    },
  ];

  getMisTareas(): Observable<Tarea[]> {
    // reemplazar con HTTP cuando el backend esté listo
    const usuario = this.auth.getUsuario();
    const id = usuario.id;
    if (!id) return of([]);
    return of(this.tareas.filter((t) => t.usuarioAsignadoId === id));
  }

  atenderTarea(id: string): Observable<Tarea> {
    // reemplazar con HTTP cuando el backend esté listo
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) {
      return of({} as Tarea);
    }
    const actualizada: Tarea = { ...tarea, estado: 'en_atencion' };
    this.tareas = this.tareas.map((t) => (t.id === id ? actualizada : t));
    return of(structuredClone(actualizada));
  }

  getTareas(): Observable<Tarea[]> {
    // reemplazar con HTTP cuando el backend esté listo
    return of([...this.tareas]);
  }

  getTareaById(id: string): Observable<Tarea | null> {
    // reemplazar con HTTP cuando el backend esté listo
    const t = this.tareas.find((x) => x.id === id);
    const usuario = this.auth.getUsuario();
    if (!t || t.usuarioAsignadoId !== usuario.id) {
      return of(null);
    }
    return of(structuredClone(t));
  }

  completarTarea(id: string): Observable<Tarea> {
    // reemplazar con HTTP cuando el backend esté listo
    const nowIso = new Date().toISOString();
    const tarea = this.tareas.find((t) => t.id === id);
    const actualizada: Tarea = {
      ...(tarea ?? ({} as Tarea)),
      id,
      estado: 'completado',
      completadoA: nowIso,
      duracion: tarea?.duracion ?? '—',
    };
    this.tareas = this.tareas.map((t) => (t.id === id ? actualizada : t));
    return of(structuredClone(actualizada));
  }
}

