import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ArchivoAdjunto, Informe } from '../models/informe.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

type InformeApi = Omit<Informe, 'creadoEn' | 'enviadoEn' | 'archivos'> & {
  creadoEn?: string;
  enviadoEn?: string | null;
  archivos?: unknown;
};

export type ArchivoUploadResp = {
  id: string;
  nombre: string;
  tipo: string;
  tamanoBytes: number;
};

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string') return v;
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class InformeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/funcionario/informes`;

  private mapArchivos(raw: unknown): ArchivoAdjunto[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) {
      return undefined;
    }
    const out: ArchivoAdjunto[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const a = item as Record<string, unknown>;
      const id = typeof a['id'] === 'string' ? a['id'] : '';
      if (!id) {
        continue;
      }
      const nombre =
        typeof a['nombre'] === 'string' ? a['nombre'] : 'archivo';
      const subRaw = a['subidoEn'] ?? a['subido_en'];
      out.push({
        id,
        nombre,
        tipo: typeof a['tipo'] === 'string' ? a['tipo'] : undefined,
        tamanoBytes:
          typeof a['tamanoBytes'] === 'number'
            ? a['tamanoBytes']
            : typeof a['tamanoBytes'] === 'string'
              ? Number(a['tamanoBytes'])
              : typeof a['tamano_bytes'] === 'number'
                ? (a['tamano_bytes'] as number)
                : undefined,
        url: typeof a['url'] === 'string' ? a['url'] : undefined,
        subidoEn:
          subRaw != null && typeof subRaw === 'string'
            ? new Date(subRaw)
            : subRaw instanceof Date
              ? subRaw
              : undefined,
      });
    }
    return out.length ? out : undefined;
  }

  private mapInforme(raw: InformeApi | Record<string, unknown>): Informe {
    const r = raw as Record<string, unknown>;
    const obsRaw = r['observaciones'] ?? r['Observaciones'];
    const observaciones =
      typeof obsRaw === 'string' && obsRaw.trim() !== '' ? obsRaw : undefined;
    const esBorrador = Boolean(r['esBorrador'] ?? r['es_borrador'] ?? false);
    const creadoRaw = r['creadoEn'] ?? r['creado_en'];
    const enviadoRaw = r['enviadoEn'] ?? r['enviado_en'];
    return {
      id: typeof r['id'] === 'string' ? r['id'] : undefined,
      tramiteId: pickStr(r, 'tramiteId', 'tramite_id'),
      tareaId: pickStr(r, 'tareaId', 'tarea_id') || undefined,
      funcionarioId: pickStr(r, 'funcionarioId', 'funcionario_id') || undefined,
      descripcion: pickStr(r, 'descripcion', 'Descripcion'),
      resultado: pickStr(r, 'resultado', 'Resultado'),
      observaciones,
      archivos: this.mapArchivos(r['archivos']),
      esBorrador,
      creadoEn:
        creadoRaw != null
          ? typeof creadoRaw === 'string'
            ? new Date(creadoRaw)
            : creadoRaw instanceof Date
              ? creadoRaw
              : undefined
          : undefined,
      enviadoEn:
        enviadoRaw != null
          ? typeof enviadoRaw === 'string'
            ? new Date(enviadoRaw)
            : enviadoRaw instanceof Date
              ? enviadoRaw
              : undefined
          : undefined,
    };
  }

  getInformePorTarea(tareaId: string): Observable<Informe | null> {
    return this.http.get<InformeApi>(`${this.base}/tarea/${tareaId}`).pipe(
      map((x) => this.mapInforme(x)),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return of(null);
        }
        return handleApiError(this.auth, this.snack, err);
      }),
    );
  }

  crearInforme(informe: Informe): Observable<Informe> {
    const body: Record<string, unknown> = {
      tramiteId: informe.tramiteId,
      descripcion: informe.descripcion,
      resultado: informe.resultado,
      esBorrador: informe.esBorrador,
    };
    if (informe.nodoActividadId) {
      body['nodoActividadId'] = informe.nodoActividadId;
    }
    if (informe.tareaId) {
      body['tareaId'] = informe.tareaId;
    }
    if (informe.observaciones?.trim()) {
      body['observaciones'] = informe.observaciones.trim();
    }
    if (informe.archivos?.length) {
      body['archivos'] = informe.archivos.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        tipo: a.tipo,
        tamanoBytes: a.tamanoBytes,
        url: a.url,
        subidoEn: a.subidoEn?.toISOString(),
      }));
    }
    return this.http.post<InformeApi>(this.base, body).pipe(
      map((x) => this.mapInforme(x)),
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }

  /** Sube binario a GridFS (`POST /api/archivos/upload`). */
  subirArchivo(file: File): Observable<ArchivoUploadResp> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http
      .post<ArchivoUploadResp>(`${environment.apiUrl}/archivos/upload`, fd)
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  /** Descarga el archivo con JWT (interceptor) para abrir en pestaña o preview. */
  getArchivoBlob(id: string): Observable<Blob> {
    return this.http
      .get(`${environment.apiUrl}/archivos/${encodeURIComponent(id)}`, {
        responseType: 'blob',
      })
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  /** Abre el adjunto en una nueva pestaña (blob + object URL). */
  verArchivoNuevaPestana(id: string): void {
    this.getArchivoBlob(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 120_000);
      },
      error: () => {
        this.snack.open('No se pudo abrir el archivo', 'Cerrar', {
          duration: 4000,
        });
      },
    });
  }
}
