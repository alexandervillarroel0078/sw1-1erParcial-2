/** Referencia a un archivo en GridFS (`POST /api/archivos/upload`). */
export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo?: string;
  tamanoBytes?: number;
  url?: string;
  subidoEn?: Date;
}

export interface Informe {
  id?: string;
  tramiteId: string;
  /** Solo informes finales; usado para GET por tarea en el backend. */
  tareaId?: string;
  funcionarioId?: string;
  descripcion: string;
  resultado: string;
  observaciones?: string;
  archivos?: ArchivoAdjunto[];
  esBorrador: boolean;
  creadoEn?: Date;
  enviadoEn?: Date;
}