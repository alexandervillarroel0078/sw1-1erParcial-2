export interface Cliente {
  id?: string;
  nombreCompleto: string;
  telefono: string;
  email?: string;
  tokenFcm?: string;
}