import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CambioCanvas {
  usuarioId: string;
  tipo: string;
  nodos: unknown[];
  aristas: unknown[];
  calles: unknown[];
}

export interface CambioCanvasPayload {
  tipo: string;
  nodos: unknown[];
  aristas: unknown[];
  calles: unknown[];
}

@Injectable({ providedIn: 'root' })
export class ColaborativoService {
  private readonly auth = inject(AuthService);
  private readonly cambiosSubject = new Subject<CambioCanvas>();

  readonly cambios$: Observable<CambioCanvas> = this.cambiosSubject.asObservable();

  private stompClient: Client | null = null;
  private politicaId: string | null = null;
  private readonly usuarioId = this.resolveUsuarioId();

  conectar(politicaId: string): void {
    if (!politicaId) return;
    if (this.politicaId === politicaId && this.stompClient?.active) return;

    this.desconectar();
    this.politicaId = politicaId;

    const token = this.auth.getToken();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,
      debug: () => {
        // Intencionalmente vacío para no ensuciar consola.
      },
      onConnect: () => {
        const pid = this.politicaId;
        if (!pid || !this.stompClient) return;
        console.log('[ColaborativoService] Conectado WS/STOMP', { politicaId: pid });
        this.stompClient.subscribe(`/topic/politica/${pid}`, (message) =>
          this.onCambioRecibido(message),
        );
      },
    });

    this.stompClient.activate();
  }

  desconectar(): void {
    this.politicaId = null;
    if (!this.stompClient) return;
    void this.stompClient.deactivate();
    this.stompClient = null;
  }

  enviarCambio(cambio: CambioCanvasPayload): void {
    if (!this.stompClient?.connected || !this.politicaId) return;
    const payload: CambioCanvas = {
      usuarioId: this.usuarioId,
      tipo: cambio.tipo,
      nodos: cambio.nodos,
      aristas: cambio.aristas,
      calles: cambio.calles,
    };
    console.log('[ColaborativoService] Enviando cambio', {
      politicaId: this.politicaId,
      tipo: payload.tipo,
      nodos: payload.nodos.length,
      aristas: payload.aristas.length,
      calles: payload.calles.length,
    });
    this.stompClient.publish({
      destination: `/app/politica/${this.politicaId}/cambio`,
      body: JSON.stringify(payload),
    });
  }

  private onCambioRecibido(message: IMessage): void {
    try {
      const body = JSON.parse(message.body) as CambioCanvas;
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

}
