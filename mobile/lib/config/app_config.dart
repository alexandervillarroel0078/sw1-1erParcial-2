/// Configuración central de la app (API y constantes de UI).
abstract final class AppConfig {
  /// Base de la API Spring Boot (incluye prefijo `/api`).
  // local
  //static const String baseUrl = 'http://192.168.0.11:8080/api';

  // nube
  static const String baseUrl = 'https://backend-734852757342.us-central1.run.app/api';
  /// Color primario Material (azul).
  static const int primaryColorValue = 0xFF1976D2;

  /// Keys de [SharedPreferences].
  static const String prefTokenKey = 'jwt_token';
  static const String prefClienteJsonKey = 'cliente_json';
}
