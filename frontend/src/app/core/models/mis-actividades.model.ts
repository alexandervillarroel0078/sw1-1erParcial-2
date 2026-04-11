export interface ActividadCatalogo {
  etiqueta: string;
  paso: number;
}

export interface PoliticaMisActividades {
  politicaNombre: string;
  actividades: ActividadCatalogo[];
}

export interface MisActividadesResponse {
  departamentoNombre: string | null;
  politicas: PoliticaMisActividades[];
}
