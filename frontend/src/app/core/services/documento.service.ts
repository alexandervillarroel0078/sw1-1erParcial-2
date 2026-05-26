import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentoDTO {
  id: string;
  tramiteId: string;
  nodoId: string;
  nombre: string;
  tipo: string;
  tamanoBytes: number;
  subidoPorNombre: string;
  subidoEn: string;
  urlDescarga?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/documentos`;

  subirDocumento(file: File, tramiteId: string, nodoId: string): Observable<DocumentoDTO> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<DocumentoDTO>(
      `${this.base}/tramite/${tramiteId}/nodo/${nodoId}/upload`, fd
    );
  }

  listarPorTramite(tramiteId: string): Observable<DocumentoDTO[]> {
    return this.http.get<DocumentoDTO[]>(`${this.base}/tramite/${tramiteId}`);
  }

  obtenerUrl(documentoId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/${documentoId}/url`);
  }

  eliminar(documentoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${documentoId}`);
  }
}
