import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CrearDocumentoColaborativoRequest,
  DocumentoColaborativo,
} from '../models/doc-colaborativo.model';

@Injectable({ providedIn: 'root' })
export class DocColaborativoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/doc-colaborativo`;

  obtener(tramiteId: string, nodoId: string): Observable<DocumentoColaborativo> {
    return this.http.get<DocumentoColaborativo>(
      `${this.base}/${tramiteId}/${nodoId}`,
    );
  }

  crear(
    tramiteId: string,
    nodoId: string,
    titulo: string,
    plantillaContenido: string,
  ): Observable<DocumentoColaborativo> {
    const body: CrearDocumentoColaborativoRequest = { titulo, plantillaContenido };
    return this.http.post<DocumentoColaborativo>(
      `${this.base}/${tramiteId}/${nodoId}`,
      body,
    );
  }
}
