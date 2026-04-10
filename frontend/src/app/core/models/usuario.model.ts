export interface Usuario {
  id?: string;
  nombre: string;
  correo: string;
  rol: 'ADMINISTRADOR' | 'FUNCIONARIO';
  departamentoId?: string;
  activo: boolean;
  creadoEn?: Date;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
  cliente: null;
}