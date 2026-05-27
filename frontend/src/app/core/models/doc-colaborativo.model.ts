export type SeccionPlantillaTipo =
  | 'texto_corto'
  | 'texto_largo'
  | 'fecha'
  | 'checkbox'
  | 'select'
  | 'tabla';

export interface SeccionPlantillaDocumentoColaborativo {
  id: string;
  titulo: string;
  tipo: SeccionPlantillaTipo;
  obligatorio?: boolean;
  /** Solo para tipo `select`. */
  opciones?: string[];
}

export interface SeccionDocumento {
  id: string;
  titulo: string;
  contenido: string;
}

export interface DocumentoColaborativo {
  id?: string;
  tramiteId: string;
  nodoId: string;
  titulo: string;
  secciones: SeccionDocumento[];
}
