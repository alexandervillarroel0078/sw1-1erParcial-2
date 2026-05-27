import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Configuración central de la app (API y constantes de UI).
abstract final class AppConfig {
  /// Base de la API Spring Boot (incluye prefijo `/api`).
  static String get baseUrl => dotenv.env['API_URL']!;

  /// Base del ia-service (incluye prefijo `/api`).
  static String get iaUrl => dotenv.env['IA_URL']!;

  /// URLs locales (referencia; no se usan salvo que se cambie a mano `API_URL` / `IA_URL`).
  static String get apiUrlLocal => dotenv.env['API_URL_LOCAL'] ?? '';

  static String get iaUrlLocal => dotenv.env['IA_URL_LOCAL'] ?? '';

  /// Color primario Material (azul).
  static const int primaryColorValue = 0xFF1976D2;

  /// Keys de [SharedPreferences].
  static const String prefTokenKey = 'jwt_token';
  static const String prefClienteJsonKey = 'cliente_json';
}
