import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DocumentoColaborativo,
} from '../models/doc-colaborativo.model';
import { AuthService } from './auth.service';

export interface CambioSeccionDocumento {
  usuarioId: string;
  usuarioNombre: string;
  seccionId: string;
  contenido: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class DocColaborativoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cambiosSubject = new Subject<CambioSeccionDocumento>();

  readonly cambios$: Observable<CambioSeccionDocumento> =
    this.cambiosSubject.asObservable();

  private readonly base = `${environment.apiUrl}/doc-colaborativo`;
  private readonly usuarioId = this.resolveUsuarioId();
  private readonly usuarioNombre = this.resolveUsuarioNombre();

  private stompClient: Client | null = null;
  private tramiteId: string | null = null;
  private nodoId: string | null = null;

  obtener(tramiteId: string, nodoId: string): Observable<DocumentoColaborativo> {
    return this.http.get<DocumentoColaborativo>(
      `${this.base}/${tramiteId}/${nodoId}`,
    );
  }

  guardar(
    tramiteId: string,
    nodoId: string,
    doc: DocumentoColaborativo,
  ): Observable<DocumentoColaborativo> {
    return this.http.put<DocumentoColaborativo>(
      `${this.base}/${tramiteId}/${nodoId}`,
      { ...doc, tramiteId, nodoId },
    );
  }

  conectar(tramiteId: string, nodoId: string): void {
    if (!tramiteId || !nodoId) return;
    if (
      this.tramiteId === tramiteId &&
      this.nodoId === nodoId &&
      this.stompClient?.active
    ) {
      return;
    }

    this.desconectar();
    this.tramiteId = tramiteId;
    this.nodoId = nodoId;

    const token = this.auth.getToken();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      debug: () => {
        // Intencionalmente vacío para no ensuciar consola.
      },
      onConnect: () => {
        const tid = this.tramiteId;
        const nid = this.nodoId;
        if (!tid || !nid || !this.stompClient) return;
        this.stompClient.subscribe(
          `/topic/doc-colaborativo/${tid}/${nid}`,
          (message) => this.onCambioRecibido(message),
        );
      },
    });

    this.stompClient.activate();
  }

  enviarCambioSeccion(seccionId: string, contenido: string): void {
    if (!this.stompClient?.connected || !this.tramiteId || !this.nodoId) {
      return;
    }

    const payload: CambioSeccionDocumento = {
      usuarioId: this.usuarioId,
      usuarioNombre: this.usuarioNombre,
      seccionId,
      contenido,
      timestamp: new Date().toISOString(),
    };

    this.stompClient.publish({
      destination: `/app/doc-colaborativo/${this.tramiteId}/${this.nodoId}/cambio`,
      body: JSON.stringify(payload),
    });
  }

  desconectar(): void {
    this.tramiteId = null;
    this.nodoId = null;
    if (!this.stompClient) return;
    void this.stompClient.deactivate();
    this.stompClient = null;
  }

  private onCambioRecibido(message: IMessage): void {
    try {
      const body = JSON.parse(message.body) as CambioSeccionDocumento;
      if (!body || body.usuarioId === this.usuarioId) {
        return;
      }
      this.cambiosSubject.next(body);
    } catch {
      // Ignora mensajes inválidos.
    }
  }

  private resolveUsuarioId(): string {
    const usuario = this.auth.getUsuario();
    return usuario.correo?.trim() || usuario.nombre?.trim() || crypto.randomUUID();
  }

  private resolveUsuarioNombre(): string {
    const usuario = this.auth.getUsuario();
    return usuario.nombre?.trim() || usuario.correo?.trim() || 'Usuario';
  }
}
