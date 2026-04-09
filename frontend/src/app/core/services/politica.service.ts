import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Arista, Nodo, Politica } from '../models/politica.model';

function uuid(): string {
  // reemplazar con IDs del backend cuando esté listo
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private politicas: Politica[] = [
    {
      id: 'pol-1',
      nombre: 'Aprobación de Vacaciones',
      subtitulo: 'Solicitud, validación y aprobación',
      colorTema: '#1976d2',
      activa: true,
      fechaCreacion: new Date('2026-02-01T10:00:00Z'),
      nodos: [
        this.nodo('n1', 'START', 'Inicio', 80, 80),
        this.nodo('n2', 'ACTIVIDAD', 'Revisar solicitud', 320, 80, 'dep-2'),
        this.nodo('n3', 'DECISION', '¿Cumple requisitos?', 560, 80),
        this.nodo('n4', 'ACTIVIDAD', 'Aprobar', 800, 40, 'dep-1'),
        this.nodo('n5', 'ACTIVIDAD', 'Rechazar', 800, 140, 'dep-1'),
        this.nodo('n6', 'END', 'Fin', 1040, 80),
      ],
      aristas: [
        this.arista('e1', 'n1', 'n2'),
        this.arista('e2', 'n2', 'n3'),
        this.arista('e3', 'n3', 'n4', 'Sí'),
        this.arista('e4', 'n3', 'n5', 'No'),
        this.arista('e5', 'n4', 'n6'),
        this.arista('e6', 'n5', 'n6'),
      ],
    },
    {
      id: 'pol-2',
      nombre: 'Alta de Cliente',
      subtitulo: 'Registro y validación',
      colorTema: '#0d47a1',
      activa: true,
      fechaCreacion: new Date('2026-02-10T10:00:00Z'),
      nodos: [
        this.nodo('a1', 'START', 'Inicio', 80, 80),
        this.nodo('a2', 'ACTIVIDAD', 'Capturar datos', 320, 80, 'dep-3'),
        this.nodo('a3', 'ACTIVIDAD', 'Validar identidad', 560, 80, 'dep-4'),
        this.nodo('a4', 'END', 'Fin', 800, 80),
      ],
      aristas: [this.arista('ae1', 'a1', 'a2'), this.arista('ae2', 'a2', 'a3'), this.arista('ae3', 'a3', 'a4')],
    },
    {
      id: 'pol-3',
      nombre: 'Reclamo y Resolución',
      subtitulo: 'Atención con tareas paralelas',
      colorTema: '#1565c0',
      activa: false,
      fechaCreacion: new Date('2026-03-05T10:00:00Z'),
      nodos: [
        this.nodo('r1', 'START', 'Inicio', 80, 80),
        this.nodo('r2', 'ACTIVIDAD', 'Recepcionar reclamo', 320, 80, 'dep-2'),
        this.nodo('r3', 'FORK_BAR', 'Paralelo', 560, 80),
        this.nodo('r4', 'ACTIVIDAD', 'Análisis técnico', 760, 40, 'dep-4'),
        this.nodo('r5', 'ACTIVIDAD', 'Contacto con cliente', 760, 140, 'dep-3'),
        this.nodo('r6', 'JOIN_BAR', 'Unir', 960, 80),
        this.nodo('r7', 'END', 'Fin', 1160, 80),
      ],
      aristas: [
        this.arista('re1', 'r1', 'r2'),
        this.arista('re2', 'r2', 'r3'),
        this.arista('re3', 'r3', 'r4'),
        this.arista('re4', 'r3', 'r5'),
        this.arista('re5', 'r4', 'r6'),
        this.arista('re6', 'r5', 'r6'),
        this.arista('re7', 'r6', 'r7'),
      ],
    },
  ];

  getPoliticas(): Observable<Politica[]> {
    // reemplazar con HTTP cuando el backend esté listo
    return of([...this.politicas]);
  }

  getPoliticaById(id: string): Observable<Politica> {
    // reemplazar con HTTP cuando el backend esté listo
    const politica = this.politicas.find((p) => p.id === id);
    return of(structuredClone(politica ?? ({} as Politica)));
  }

  crearPolitica(politica: Politica): Observable<Politica> {
    // reemplazar con HTTP cuando el backend esté listo
    const nueva: Politica = {
      ...politica,
      id: politica.id ?? uuid(),
      fechaCreacion: politica.fechaCreacion ?? new Date(),
      nodos: politica.nodos ?? [],
      aristas: politica.aristas ?? [],
    };
    this.politicas = [nueva, ...this.politicas];
    return of(structuredClone(nueva));
  }

  actualizarPolitica(id: string, politica: Politica): Observable<Politica> {
    // reemplazar con HTTP cuando el backend esté listo
    const idx = this.politicas.findIndex((p) => p.id === id);
    const actualizada: Politica = { ...this.politicas[idx], ...politica, id };
    if (idx >= 0) {
      this.politicas = this.politicas.map((p) => (p.id === id ? actualizada : p));
    } else {
      this.politicas = [actualizada, ...this.politicas];
    }
    return of(structuredClone(actualizada));
  }

  eliminarPolitica(id: string): Observable<void> {
    // reemplazar con HTTP cuando el backend esté listo
    this.politicas = this.politicas.filter((p) => p.id !== id);
    return of(void 0);
  }

  activarDesactivar(id: string): Observable<Politica> {
    // reemplazar con HTTP cuando el backend esté listo
    const idx = this.politicas.findIndex((p) => p.id === id);
    if (idx < 0) return of({} as Politica);

    const actual = this.politicas[idx];
    const actualizado: Politica = { ...actual, activa: !actual.activa };
    this.politicas = this.politicas.map((p) => (p.id === id ? actualizado : p));
    return of(structuredClone(actualizado));
  }

  private nodo(
    id: string,
    tipo: Nodo['tipo'],
    etiqueta: string,
    posicionX: number,
    posicionY: number,
    departamentoId?: string,
  ): Nodo {
    return { id, tipo, etiqueta, posicionX, posicionY, departamentoId };
  }

  private arista(id: string, desdeNodoId: string, haciaNodoId: string, etiqueta?: string): Arista {
    return { id, desdeNodoId, haciaNodoId, etiqueta };
  }
}

