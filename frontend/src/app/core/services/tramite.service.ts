import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Tramite } from '../models/tramite.model';
import { AuthService } from './auth.service';

function uuid(): string {
  // reemplazar con IDs del backend cuando esté listo
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private readonly auth = inject(AuthService);

  private tramites: Tramite[] = [
    {
      id: 'tra-1',
      politicaId: 'pol-1',
      politicaNombre: 'Aprobación de Vacaciones',
      clienteId: 'cli-1',
      creadoPorUsuarioId: 'u-admin-1',
      estado: 'en_proceso',
      esParalelo: false,
      creadoEn: new Date('2026-03-20T10:00:00Z'),
      actualizadoEn: new Date('2026-03-21T10:00:00Z'),
      actividadActual: 'Revisar solicitud',
      pasoActual: 2,
      totalPasos: 4,
    },
    {
      id: 'tra-2',
      politicaId: 'pol-3',
      politicaNombre: 'Reclamo y Resolución',
      clienteId: 'cli-2',
      creadoPorUsuarioId: 'u-func-2',
      estado: 'demorado',
      esParalelo: true,
      creadoEn: new Date('2026-03-25T10:00:00Z'),
      actualizadoEn: new Date('2026-03-28T10:00:00Z'),
      actividadActual: 'Análisis técnico',
      pasoActual: 3,
      totalPasos: 6,
    },
    {
      id: 'tra-3',
      politicaId: 'pol-2',
      politicaNombre: 'Alta de Cliente',
      clienteId: 'cli-1',
      creadoPorUsuarioId: 'u-func-1',
      estado: 'iniciado',
      esParalelo: false,
      creadoEn: new Date('2026-04-08T10:00:00Z'),
      actualizadoEn: new Date('2026-04-08T10:00:00Z'),
      actividadActual: 'Capturar datos',
      pasoActual: 1,
      totalPasos: 3,
    },
    {
      id: 'tra-4',
      politicaId: 'pol-1',
      politicaNombre: 'Aprobación de Vacaciones',
      clienteId: 'cli-2',
      creadoPorUsuarioId: 'u-admin-1',
      estado: 'completado',
      esParalelo: false,
      creadoEn: new Date('2026-02-10T10:00:00Z'),
      actualizadoEn: new Date('2026-02-15T10:00:00Z'),
      actividadActual: 'Finalizado',
      pasoActual: 4,
      totalPasos: 4,
    },
  ];

  getTramites(): Observable<Tramite[]> {
    // reemplazar con HTTP cuando el backend esté listo
    return of([...this.tramites]);
  }

  crearTramite(t: Tramite): Observable<Tramite> {
    // reemplazar con HTTP cuando el backend esté listo
    const usuario = this.auth.getUsuario();
    const nuevo: Tramite = {
      ...t,
      id: t.id ?? uuid(),
      creadoPorUsuarioId: t.creadoPorUsuarioId ?? usuario.id,
      creadoEn: t.creadoEn ?? new Date(),
      actualizadoEn: new Date(),
    };
    this.tramites = [nuevo, ...this.tramites];
    return of(structuredClone(nuevo));
  }
}

