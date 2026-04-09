export type CampoFormularioTipo =
  | 'texto_corto'
  | 'texto_largo'
  | 'select'
  | 'imagen'
  | 'archivo'
  | 'checkbox'
  | 'fecha';

export interface CampoFormularioItem {
  id: string;
  nombre: string;
  tipo: CampoFormularioTipo;
  obligatorio: boolean;
  orden: number;
  /** Solo para tipo select */
  opcionesSelect?: string[];
}

export interface TipoCampoPaleta {
  tipo: CampoFormularioTipo;
  label: string;
  icon: string;
}
