import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/tramite.dart';
import 'auth_service.dart';

/// Trámites del cliente autenticado.
class TramiteService {
  TramiteService(this._auth);

  final AuthService _auth;

  Map<String, String> get _headers {
    final t = _auth.getToken();
    return {
      'Accept': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  /// `GET /api/cliente/tramites`
  Future<List<Tramite>> getTramites() async {
    final uri = Uri.parse('${AppConfig.baseUrl}/cliente/tramites');
    final res = await http.get(uri, headers: _headers);
    _throwIfError(res);
    final list = jsonDecode(res.body) as List<dynamic>;
    return list
        .map((e) => Tramite.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// `GET /api/cliente/tramites/{id}/detalle`
  Future<TramiteDetalleResponse> getDetalle(String id) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/cliente/tramites/$id/detalle');
    final res = await http.get(uri, headers: _headers);
    _throwIfError(res);
    return TramiteDetalleResponse.fromJson(
      jsonDecode(res.body) as Map<String, dynamic>,
    );
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String msg = 'Error ${res.statusCode}';
    try {
      final m = jsonDecode(res.body);
      if (m is Map && m['message'] != null) msg = '${m['message']}';
    } catch (_) {}
    throw TramiteApiException(msg, res.statusCode);
  }
}

class TramiteApiException implements Exception {
  TramiteApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
