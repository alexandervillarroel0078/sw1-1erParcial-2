/** Respuesta GET /api/admin/tramites/{id}/detalle */
export interface TramiteDetalleInforme {
  descripcion?: string | null;
  resultado?: string | null;
  enviadoEn?: string | null;
}

export interface TramiteDetalleTarea {
  id: string;
  nodoFlujoId?: string | null;
  /** Tipo de nodo en la política; solo ACTIVIDAD cuenta como paso humano. */
  tipoNodo?: string | null;
  actividadEtiqueta?: string | null;
  departamentoTexto?: string | null;
  usuarioAsignadoNombre?: string | null;
  estado: string;
  creadoEn?: string | null;
  completadoEn?: string | null;
  diasAbierto: number;
  esParalelo: boolean;
  esIterativo: boolean;
  iterativoSecuencia: number;
  decisionEtiqueta?: string | null;
  informe: TramiteDetalleInforme | null;
}

export interface TramiteDetalleResumen {
  id: string;
  politicaNombre?: string | null;
  clienteNombre?: string | null;
  estado: string;
  creadoEn?: string | null;
  pasoActual?: number | null;
  totalPasos?: number | null;
  esFlujoParalelo?: boolean | null;
  tieneActividadIterativa: boolean;
}

export interface TramiteDetalleResponse {
  tramite: TramiteDetalleResumen;
  tareas: TramiteDetalleTarea[];
}
