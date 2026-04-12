import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/notificacion.dart';
import 'auth_service.dart';

/// Notificaciones del cliente.
class NotificacionService {
  NotificacionService(this._auth);

  final AuthService _auth;

  Map<String, String> get _headers {
    final t = _auth.getToken();
    return {
      'Accept': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  /// `GET /api/cliente/notificaciones`
  Future<List<Notificacion>> getNotificaciones() async {
    final uri = Uri.parse('${AppConfig.baseUrl}/cliente/notificaciones');
    final res = await http.get(uri, headers: _headers);
    _throwIfError(res);
    final list = jsonDecode(res.body) as List<dynamic>;
    return list
        .map((e) => Notificacion.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// `PATCH /api/cliente/notificaciones/{id}/leida`
  Future<Notificacion> marcarLeida(String id) async {
    final uri =
        Uri.parse('${AppConfig.baseUrl}/cliente/notificaciones/$id/leida');
    final res = await http.patch(uri, headers: _headers);
    _throwIfError(res);
    return Notificacion.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String msg = 'Error ${res.statusCode}';
    try {
      final m = jsonDecode(res.body);
      if (m is Map && m['message'] != null) msg = '${m['message']}';
    } catch (_) {}
    throw NotificacionApiException(msg, res.statusCode);
  }
}

class NotificacionApiException implements Exception {
  NotificacionApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
