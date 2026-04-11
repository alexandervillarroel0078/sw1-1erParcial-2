export interface Cliente {
  id: string;
  nombreCompleto: string;
  telefono: string;
  email: string | null;
  tokenFcm: string | null;
  activo: boolean;
  creadoEn: string;
}
