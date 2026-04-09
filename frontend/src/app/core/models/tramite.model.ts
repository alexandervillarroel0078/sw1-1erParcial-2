export interface Tramite {
  id?: string;
  politicaId: string;
  politicaNombre?: string;
  clienteId: string;
  creadoPorUsuarioId?: string;
  estado: 'iniciado' | 'en_proceso' | 'demorado' | 'completado' | 'cancelado';
  esParalelo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
  /** Actividad en curso (mock / backend) */
  actividadActual?: string;
  pasoActual?: number;
  totalPasos?: number;
}