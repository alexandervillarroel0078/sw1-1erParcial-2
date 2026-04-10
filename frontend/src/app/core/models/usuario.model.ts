export interface Usuario {
  id?: string;
  nombre: string;
  correo: string;
  rol: 'ADMINISTRADOR' | 'FUNCIONARIO';
  departamentoId?: string;
  activo: boolean;
  creadoEn?: Date;
  /** Solo envío al crear/actualizar usuario vía API admin */
  password?: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario | null;
  cliente: unknown;
}