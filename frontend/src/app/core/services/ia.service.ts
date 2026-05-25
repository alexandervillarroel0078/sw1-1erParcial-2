import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface DiagramaIaResponse {
  nodos: Record<string, unknown>[];
  aristas: Record<string, unknown>[];
}

export interface CampoFormularioIa {
  id: string;
  etiqueta: string;
  tipo: string;
}

export interface ValorCampoIa {
  id: string;
  valor: string;
}

export interface RellenarFormularioIaResponse {
  valores: ValorCampoIa[];
}

export interface PoliticaIaItem {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface SugerirPoliticaResponse {
  politicaId: string;
  justificacion: string;
}

export interface ConsultaReporteResponse {
  descripcion: string;
  columnas: string[];
  filas: Record<string, unknown>[];
  total: number;
  tipoGrafico?: 'pie' | 'bar' | 'line' | null;
  campoGrafico?: string | null;
}

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly iaUrl = environment.iaUrl;

  generarDiagrama(instruccion: string): Observable<DiagramaIaResponse> {
    return this.http.post<DiagramaIaResponse>(
      `${this.iaUrl}/api/ia/generar-diagrama`,
      { instruccion },
    );
  }

  editarDiagrama(
    instruccion: string,
    nodos: unknown[],
    aristas: unknown[],
  ): Observable<DiagramaIaResponse> {
    return this.http.post<DiagramaIaResponse>(
      `${this.iaUrl}/api/ia/editar-diagrama`,
      {
        instruccion,
        nodosActuales: nodos,
        aristasActuales: aristas,
      },
    );
  }

  rellenarFormulario(body: {
    textoVoz: string;
    campos: CampoFormularioIa[];
  }): Observable<RellenarFormularioIaResponse> {
    return this.http.post<RellenarFormularioIaResponse>(
      `${this.iaUrl}/api/ia/rellenar-formulario`,
      body,
    );
  }

  sugerirPolitica(body: {
    textoVoz: string;
    politicas: PoliticaIaItem[];
  }): Observable<SugerirPoliticaResponse> {
    return this.http.post<SugerirPoliticaResponse>(
      `${this.iaUrl}/api/ia/sugerir-politica`,
      body,
    );
  }

  consultaReporte(texto: string): Observable<ConsultaReporteResponse> {
    return this.http.post<ConsultaReporteResponse>(
      `${this.iaUrl}/api/ia/consulta-reporte`,
      { texto },
    );
  }
}
