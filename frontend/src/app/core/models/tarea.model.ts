export interface Tarea {
  id?: string;
  tramiteId: string;
  nodoFlujoId: string;
  actividadEtiqueta: string;
  departamentoTexto: string;
  politicaNombre: string;
  pasoActual: number;
  totalPasos: number;
  clienteNombre?: string;
  /** Copia de cliente del trámite (referencia en UI si falta nombre). */
  tramiteClienteId?: string;
  diasAbierto?: number;
  transcurrido?: string;
  usuarioAsignadoId?: string;
  estado: 'pendiente' | 'en_atencion' | 'completado';
  completadoA?: string;
  duracion?: string;
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