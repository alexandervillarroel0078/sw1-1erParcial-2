import type { Nodo } from '../../../core/models/politica.model';

export type NodoCanvasTipo = Nodo['tipo'];

/** Nodo en el lienzo del diseñador (coordenadas en espacio mundo SVG). */
export interface NodoCanvas {
  id: string;
  tipo: NodoCanvasTipo;
  etiqueta: string;
  x: number;
  y: number;
  /** id de departamento (mock) */
  departamento?: string;
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
}

export type PuertoCanvas = 'in' | 'out';
