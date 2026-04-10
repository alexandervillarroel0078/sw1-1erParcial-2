export interface Nodo {
  id: string;
  tipo: 'START' | 'END' | 'ACTIVIDAD' | 'DECISION' | 'FORK_BAR' | 'JOIN_BAR';
  etiqueta: string;
  posicionX: number;
  posicionY: number;
  departamentoId?: string;
  /** Calle del diseñador (swimlane); opcional en persistencia */
  calleId?: string;
  ancho?: number;
  alto?: number;
}

/** Calle (swimlane) guardada con la política */
export interface PoliticaCalle {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  departamentoId?: string;
  anchoPx?: number;
  altoPx?: number;
}

export interface Arista {
  id: string;
  desdeNodoId: string;
  haciaNodoId: string;
  etiqueta?: string;
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
  orientacionCalles?: 'vertical' | 'horizontal';
}