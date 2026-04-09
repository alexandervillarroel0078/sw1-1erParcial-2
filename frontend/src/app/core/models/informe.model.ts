export interface Informe {
  id?: string;
  tramiteId: string;
  funcionarioId: string;
  descripcion: string;
  resultado: string;
  observaciones?: string;
  esBorrador: boolean;
  creadoEn?: Date;
  enviadoEn?: Date;
}