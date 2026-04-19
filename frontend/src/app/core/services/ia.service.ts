import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly iaUrl = 'http://localhost:8000';

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
}
