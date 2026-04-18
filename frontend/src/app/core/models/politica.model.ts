/** Coincide con enum Java `TipoNodo` (JSON en MAYÚSCULAS). */
export type NodoTipo =
  | 'START'
  | 'END'
  | 'ACTIVIDAD'
  | 'DECISION'
  | 'FORK_BAR'
  | 'JOIN_BAR';

/** Coincide con enum Java `OrientacionCalles` (JSON en MAYÚSCULAS). */
export type OrientacionCalles = 'VERTICAL' | 'HORIZONTAL';

const NODO_TIPOS_VALIDOS = new Set<string>([
  'START',
  'END',
  'ACTIVIDAD',
  'DECISION',
  'FORK_BAR',
  'JOIN_BAR',
]);

export function normalizeOrientacionCalles(
  v: string | undefined | null,
): OrientacionCalles {
  const s = (v ?? 'VERTICAL').toString().trim().toUpperCase();
  return s === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL';
}

export function normalizeNodoTipo(t: string | undefined | null): NodoTipo {
  const s = (t ?? 'ACTIVIDAD').toString().trim().toUpperCase();
  return (NODO_TIPOS_VALIDOS.has(s) ? s : 'ACTIVIDAD') as NodoTipo;
}

export interface Nodo {
  id: string;
  tipo: NodoTipo;
  etiqueta: string;
  posicionX: number;
  posicionY: number;
  departamentoId?: string;
  /** Nombre legible del departamento (persistencia / API) */
  departamentoTexto?: string;
  /** Calle del diseñador (swimlane); opcional en persistencia */
  calleId?: string;
  ancho?: number;
  alto?: number;
  /** SLA en minutos (solo ACTIVIDAD); JSON camelCase `slaMinutos`. */
  slaMinutos?: number;
}

/**
 * Calle (swimlane) guardada con la política.
 * El DTO Java embebido no define enums; si se agregan, serializar en MAYÚSCULAS.
 */
export interface PoliticaCalle {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  departamentoId?: string;
  anchoPx?: number;
  altoPx?: number;
}

/** Lado del nodo DECISIÓN donde entra la arista (coord. locales del rombo). */
export type AristaHaciaPuerto = 'N' | 'S' | 'E' | 'O';

export interface Arista {
  id: string;
  desdeNodoId: string;
  haciaNodoId: string;
  etiqueta?: string;
  /** Vértice de entrada en el destino (DECISIÓN o JOIN_BAR: N/S/E/O). */
  haciaPuerto?: AristaHaciaPuerto;
  /** Vértice de salida en el origen cuando es FORK_BAR (E/N/S). */
  desdePuerto?: AristaHaciaPuerto;
}

export interface Politica {
  id?: string;
  nombre: string;
  subtitulo?: string;
  colorTema?: string;
  activa: boolean;
  fechaCreacion?: Date;
  nodos?: Nodo[];
  aristas?: Arista[];
  callesDiseno?: PoliticaCalle[];
  orientacionCalles?: OrientacionCalles;
}