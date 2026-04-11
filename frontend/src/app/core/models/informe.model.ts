export interface Informe {
  id?: string;
  tramiteId: string;
  /** Solo informes finales; usado para GET por tarea en el backend. */
  tareaId?: string;
  funcionarioId?: string;
  descripcion: string;
  resultado: string;
  observaciones?: string;
  esBorrador: boolean;
  creadoEn?: Date;
  enviadoEn?: Date;
}