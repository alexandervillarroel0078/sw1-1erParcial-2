/** Body para POST /api/funcionario/tramites */
export interface TramiteCrearPayload {
  politicaId: string;
  clienteNombreCompleto: string;
  clienteTelefono: string;
  clienteEmail?: string;
}

export interface Tramite {
  id?: string;
  politicaId: string;
  politicaNombre?: string;
  clienteId?: string;
  clienteNombre?: string;
  creadoPorUsuarioId?: string;
  estado:
    | 'iniciado'
    | 'en_proceso'
    | 'esperando_decision'
    | 'demorado'
    | 'completado'
    | 'cancelado';
  esParalelo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
  /** Actividad en curso (mock / backend) */
  actividadActual?: string;
  /** Actividades ACTIVIDAD ya completadas (0 … totalPasos). */
  pasoActual?: number;
  totalPasos?: number;
  /** Listado admin: porcentaje calculado en backend. */
  porcentajeAvance?: number;
}