import 'package:flutter/foundation.dart';

import '../models/cliente.dart';
import '../services/auth_service.dart';

/// Estado global de sesión (Provider + ChangeNotifier).
class AuthProvider extends ChangeNotifier {
  AuthProvider(this._auth);

  final AuthService _auth;
  Cliente? _cliente;

  Cliente? get cliente => _cliente;

  /// Nombre para mostrar en AppBar.
  String get nombreMostrado =>
      _cliente?.nombreCompleto.trim().isNotEmpty == true
          ? _cliente!.nombreCompleto
          : 'Cliente';

  /// Carga token y cliente desde [SharedPreferences] al arranque.
  void hydrateFromStorage() {
    if (_auth.isLoggedIn()) {
      _cliente = _auth.getClienteGuardado();
    } else {
      _cliente = null;
    }
    notifyListeners();
  }

  bool get isLoggedIn => _auth.isLoggedIn();

  Future<void> login(String email, String password) async {
    _cliente = await _auth.login(email, password);
    notifyListeners();
  }

  Future<void> logout() async {
    await _auth.logout();
    _cliente = null;
    notifyListeners();
  }
}
