import type {
  AristaHaciaPuerto,
  Nodo,
  OrientacionCalles,
} from '../../../core/models/politica.model';

export type NodoCanvasTipo = Nodo['tipo'];

/** Calle (swimlane) = departamento en el lienzo */
export interface CalleCanvas {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  departamentoId?: string;
  /** Ancho en px (modo vertical); primera calle 300, resto 250 por defecto */
  anchoPx?: number;
  /** Alto en px (modo horizontal); primera 300, resto 250 por defecto, mín. 150 */
  altoPx?: number;
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
  /** Nombre del departamento para guardado y UI */
  departamentoTexto?: string;
  /** Calle asignada (ACTividades por posición en el canvas) */
  calleId?: string;
  /** Solo aplica visual/lógica a ACTIVIDAD */
  slaMinutos?: number;
}

export interface AristaCanvas {
  id: string;
  desdeNodoId: string;
  haciaNodoId: string;
  etiqueta?: string;
  haciaPuerto?: AristaHaciaPuerto;
  /** Salida en punta E/N/S cuando el origen es FORK_BAR (lienzo). */
  desdePuerto?: AristaHaciaPuerto;
}

export interface PolicyCanvasSnapshot {
  nombrePolitica: string;
  nodos: NodoCanvas[];
  aristas: AristaCanvas[];
  zoom: number;
  panX: number;
  panY: number;
  calles: CalleCanvas[];
  orientacionCalles: OrientacionCalles;
}

export type PuertoCanvas = 'in' | 'out';
