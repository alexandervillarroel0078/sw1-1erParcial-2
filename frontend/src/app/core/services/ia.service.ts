import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DiagramaIaResponse {
  nodos: Record<string, unknown>[];
  aristas: Record<string, unknown>[];
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
}
