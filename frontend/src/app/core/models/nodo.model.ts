export interface CampoFormulario {
  id?: string;
  formularioId?: string;
  orden: number;
  /** API Java: enum `TipoCampo` (p. ej. `TEXTO_LARGO`) o snake en minúsculas. */
  tipo:
    | 'texto_corto'
    | 'texto_largo'
    | 'select'
    | 'imagen'
    | 'archivo'
    | 'checkbox'
    | 'fecha'
    | string;
  etiqueta: string;
  textoAyuda?: string;
  obligatorio: boolean;
  opciones?: any[];
}

import type { SeccionPlantillaDocumentoColaborativo } from './doc-colaborativo.model';

export type { SeccionPlantillaDocumentoColaborativo };

export interface FormularioActividad {
  id?: string;
  nodoActividadId: string;
  politicaId: string;
  campos?: CampoFormulario[];
  tituloDocumentoColaborativo?: string;
  seccionesDocumentoColaborativo?: SeccionPlantillaDocumentoColaborativo[];
  habilitadoDocumentoColaborativo?: boolean;
}