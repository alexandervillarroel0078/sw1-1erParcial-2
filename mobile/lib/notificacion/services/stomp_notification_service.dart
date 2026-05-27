import 'dart:async';
import 'dart:convert';

import 'package:stomp_dart_client/stomp.dart';
import 'package:stomp_dart_client/stomp_config.dart';
import 'package:stomp_dart_client/stomp_frame.dart';

import '../../config/app_config.dart';
import '../models/notificacion.dart';
import 'local_notification_service.dart';

/// STOMP sobre SockJS al mismo endpoint que el frontend Angular (`/ws`).
class StompNotificationService {
  StompNotificationService._();

  static StompClient? _client;

  static final StreamController<Notificacion> _notificacionesController =
      StreamController<Notificacion>.broadcast();

  /// Emite cada [Notificacion] recibida por STOMP (tras parsear el JSON).
  static Stream<Notificacion> get notificaciones =>
      _notificacionesController.stream;

  static String get _wsUrl {
    final base = AppConfig.baseUrl;
    return base.replaceAll('/api', '') + '/ws';
  }

  static void conectar(String clienteId, String? token) {
    desconectar();
    if (clienteId.isEmpty) return;

    final Map<String, String> authHeaders = token != null && token.isNotEmpty
        ? {'Authorization': 'Bearer $token'}
        : {};

    _client = StompClient(
      config: StompConfig.sockJS(
        url: _wsUrl,
        reconnectDelay: const Duration(seconds: 5),
        stompConnectHeaders: authHeaders,
        webSocketConnectHeaders: authHeaders,
        onConnect: (StompFrame frame) {
          _client?.subscribe(
            destination: '/topic/cliente/$clienteId/notificaciones',
            callback: (StompFrame msg) {
              final body = msg.body;
              if (body == null || body.isEmpty) return;
              try {
                final map = jsonDecode(body) as Map<String, dynamic>;
                final n = Notificacion.fromJson(map);
                LocalNotificationService.show(n);
                _notificacionesController.add(n);
              } catch (_) {}
            },
          );
        },
        onWebSocketError: (_) {},
      ),
    );
    _client!.activate();
  }

  static void desconectar() {
    _client?.deactivate();
    _client = null;
  }
}
