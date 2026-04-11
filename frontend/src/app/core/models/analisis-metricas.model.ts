export type EstadoAnalisisApi = 'RAPIDO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface AnalisisNodoDetalle {
  nodoId: string;
  etiqueta: string;
  departamento: string;
  tiempoPromedio: number;
  cantidadTareas: number;
  estado: EstadoAnalisisApi | string;
}

export interface AnalisisPoliticaMetricas {
  politicaId: string;
  tramitesAnalizados: number;
  tiempoPromedioTotal: number;
  nodoCriticoId: string | null;
  nodoCriticoEtiqueta: string;
  nodoCriticoPromedio: number;
  detalleNodos: AnalisisNodoDetalle[];
}
