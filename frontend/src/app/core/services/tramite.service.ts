import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { TramiteDetalleResponse } from '../models/tramite-detalle.model';
import { Tramite, TramiteCrearPayload } from '../models/tramite.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

const ESTADO_TRAMITE: Record<string, Tramite['estado']> = {
  INICIADO: 'iniciado',
  EN_PROCESO: 'en_proceso',
  ESPERANDO_DECISION: 'esperando_decision',
  DEMORADO: 'demorado',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
  iniciado: 'iniciado',
  en_proceso: 'en_proceso',
  esperando_decision: 'esperando_decision',
  demorado: 'demorado',
  completado: 'completado',
  cancelado: 'cancelado',
};

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private mapTramite(raw: Tramite & { estado?: string }): Tramite {
    const estadoKey = raw.estado ?? 'iniciado';
    const estado = ESTADO_TRAMITE[estadoKey] ?? 'iniciado';
    return {
      ...raw,
      estado,
      creadoEn:
        raw.creadoEn != null
          ? typeof raw.creadoEn === 'string'
            ? new Date(raw.creadoEn)
            : raw.creadoEn
          : undefined,
      actualizadoEn:
        raw.actualizadoEn != null
          ? typeof raw.actualizadoEn === 'string'
            ? new Date(raw.actualizadoEn)
            : raw.actualizadoEn
          : undefined,
    };
  }

  getTramites(): Observable<Tramite[]> {
    return this.http
      .get<Tramite[]>(`${environment.apiUrl}/admin/tramites`)
      .pipe(
        map((list) => list.map((x) => this.mapTramite(x))),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }

  getDetalleTramite(id: string): Observable<TramiteDetalleResponse> {
    return this.http
      .get<TramiteDetalleResponse>(
        `${environment.apiUrl}/admin/tramites/${encodeURIComponent(id)}/detalle`,
      )
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }

  crearTramite(payload: TramiteCrearPayload): Observable<Tramite> {
    const body: Record<string, string> = {
      politicaId: payload.politicaId.trim(),
      clienteNombreCompleto: payload.clienteNombreCompleto.trim(),
      clienteTelefono: payload.clienteTelefono.trim(),
    };
    const email = payload.clienteEmail?.trim();
    if (email) {
      body['clienteEmail'] = email;
    }
    return this.http
      .post<Tramite>(`${environment.apiUrl}/funcionario/tramites`, body)
      .pipe(
        map((x) => this.mapTramite(x)),
        catchError((err) => handleApiError(this.auth, this.snack, err)),
      );
  }
}
