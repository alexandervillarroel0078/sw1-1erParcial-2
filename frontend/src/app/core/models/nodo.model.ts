export interface CampoFormulario {
  id?: string;
  formularioId: string;
  orden: number;
  tipo: 'texto_corto' | 'texto_largo' | 'select' | 
        'imagen' | 'archivo' | 'checkbox' | 'fecha';
  etiqueta: string;
  textoAyuda?: string;
  obligatorio: boolean;
  opciones?: any[];
}

export interface FormularioActividad {
  id?: string;
  nodoActividadId: string;
  politicaId: string;
  campos?: CampoFormulario[];
}