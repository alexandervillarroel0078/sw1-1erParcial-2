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
  diasAbierto?: number;
  transcurrido?: string;
  usuarioAsignadoId?: string;
  estado: 'pendiente' | 'en_atencion' | 'completado';
  completadoA?: string;
  duracion?: string;
}