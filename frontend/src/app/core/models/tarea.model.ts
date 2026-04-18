export interface OpcionDecision {
  etiqueta: string;
  descripcion?: string | null;
}

export interface Tarea {
  id?: string;
  tramiteId: string;
  nodoFlujoId: string;
  actividadEtiqueta: string;
  departamentoTexto: string;
  politicaId?: string;
  politicaNombre: string;
  pasoActual: number;
  totalPasos: number;
  clienteNombre?: string;
  /** Copia de cliente del trámite (referencia en UI si falta nombre). */
  tramiteClienteId?: string;
  diasAbierto?: number;
  /** Inicio de la tarea (ISO); para comparar con SLA en bandeja. */
  creadoEn?: string;
  /** SLA del nodo en minutos (listado «mis tareas» enriquecido). */
  slaMinutos?: number;
  /** Estado del trámite (p. ej. DEMORADO) en listados enriquecidos. */
  tramiteEstado?: string;
  transcurrido?: string;
  usuarioAsignadoId?: string;
  estado: 'pendiente' | 'en_atencion' | 'demorado' | 'completado';
  completadoA?: string;
  duracion?: string;
  /** Respuesta PATCH COMPLETAR cuando el trámite espera elección de rama. */
  requiereDecision?: boolean;
  condicionDecision?: string | null;
  opcionesDecision?: OpcionDecision[];
}

export function etiquetaClienteReferencia(
  t: Pick<Tarea, 'clienteNombre' | 'tramiteClienteId'>,
): string {
  const n = (t.clienteNombre ?? '').trim();
  if (n) return n;
  const id = (t.tramiteClienteId ?? '').trim();
  if (id) return `ID ref.: ${id}`;
  return '—';
}