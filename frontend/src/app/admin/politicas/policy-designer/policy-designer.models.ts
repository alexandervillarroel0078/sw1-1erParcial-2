import type { Nodo } from '../../../core/models/politica.model';

export type NodoCanvasTipo = Nodo['tipo'];

/** Calle (swimlane) = departamento en el lienzo */
export interface CalleCanvas {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  departamentoId?: string;
}

/** Nodo en el lienzo del diseñador (coordenadas en espacio mundo SVG). */
export interface NodoCanvas {
  id: string;
  tipo: NodoCanvasTipo;
  etiqueta: string;
  x: number;
  y: number;
  /** id de departamento (mock) */
  departamento?: string;
  /** Calle asignada (ACTividades por posición en el canvas) */
  calleId?: string;
  /** Solo aplica visual/lógica a ACTIVIDAD */
  slaHoras?: number;
}

export interface AristaCanvas {
  id: string;
  desdeNodoId: string;
  haciaNodoId: string;
  etiqueta?: string;
}

export interface PolicyCanvasSnapshot {
  nombrePolitica: string;
  nodos: NodoCanvas[];
  aristas: AristaCanvas[];
  zoom: number;
  panX: number;
  panY: number;
  calles: CalleCanvas[];
  orientacionCalles: 'vertical' | 'horizontal';
}

export type PuertoCanvas = 'in' | 'out';
