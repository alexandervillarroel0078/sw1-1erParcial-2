import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../config/app_config.dart';
import '../models/cliente.dart';

/// Autenticación JWT contra `/api/auth/login`.
class AuthService {
  AuthService(this._prefs);

  final SharedPreferences _prefs;

  /// Login con email y contraseña. Persiste token y datos del cliente.
  Future<Cliente> login(String email, String password) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/auth/login');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: jsonEncode({
        'correo': email.trim(),
        'password': password,
      }),
    );
    if (res.statusCode != 200) {
      throw AuthException(_mensajeError(res.body, res.statusCode));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    final token = map['token'] as String?;
    final clienteMap = map['cliente'] as Map<String, dynamic>?;
    if (token == null || token.isEmpty) {
      throw AuthException('Respuesta sin token.');
    }
    if (clienteMap == null) {
      throw AuthException(
        'Esta cuenta no es de cliente. Use la app de funcionario o administrador.',
      );
    }
    final cliente = Cliente.fromJson(clienteMap);
    await _prefs.setString(AppConfig.prefTokenKey, token);
    await _prefs.setString(
      AppConfig.prefClienteJsonKey,
      jsonEncode(cliente.toJson()),
    );
    return cliente;
  }

  /// Elimina token y datos guardados.
  Future<void> logout() async {
    await _prefs.remove(AppConfig.prefTokenKey);
    await _prefs.remove(AppConfig.prefClienteJsonKey);
  }

  /// Token JWT actual, si existe.
  String? getToken() => _prefs.getString(AppConfig.prefTokenKey);

  /// Cliente persistido tras el último login.
  Cliente? getClienteGuardado() {
    final raw = _prefs.getString(AppConfig.prefClienteJsonKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return Cliente.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  bool isLoggedIn() {
    final t = getToken();
    return t != null && t.isNotEmpty;
  }

  static String _mensajeError(String body, int code) {
    try {
      final m = jsonDecode(body);
      if (m is Map && m['message'] != null) return '${m['message']}';
    } catch (_) {}
    return 'Error de autenticación ($code)';
  }
}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
