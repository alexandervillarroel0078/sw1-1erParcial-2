import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../auth/services/auth_service.dart';
import '../../config/app_config.dart';
import '../models/politica.dart';

/// Políticas activas para funcionario/cliente autenticado.
class PoliticaService {
  PoliticaService(this._auth);

  final AuthService _auth;

  Map<String, String> get _headers {
    final t = _auth.getToken();
    return {
      'Accept': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  /// `GET /api/cliente/politicas/activas`
  Future<List<Politica>> getPoliticasActivas() async {
    final uri = Uri.parse('${AppConfig.baseUrl}/cliente/politicas/activas');
    final res = await http.get(uri, headers: _headers);
    _throwIfError(res);
    final list = jsonDecode(res.body) as List<dynamic>;
    return list
        .map((e) => Politica.fromJson(e as Map<String, dynamic>))
        .where((p) => p.id.isNotEmpty && p.activa)
        .toList();
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String msg = 'Error ${res.statusCode}';
    try {
      final m = jsonDecode(res.body);
      if (m is Map && m['message'] != null) msg = '${m['message']}';
    } catch (_) {}
    throw PoliticaApiException(msg, res.statusCode);
  }
}

class PoliticaApiException implements Exception {
  PoliticaApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
