/// Mensajes de error legibles para el usuario (sin detalles técnicos).
String mensajeErrorAmigable(String error) {
  if (error.contains('SocketException') ||
      error.contains('Connection refused') ||
      error.contains('ClientException')) {
    return 'Sin conexión al servidor.\nVerifica tu conexión a internet.';
  } else if (error.contains('401') || error.contains('Unauthorized')) {
    return 'Tu sesión ha expirado.\nInicia sesión nuevamente.';
  } else if (error.contains('500')) {
    return 'Error en el servidor.\nIntenta más tarde.';
  } else if (error.contains('404')) {
    return 'Recurso no encontrado.';
  }
  return 'Ocurrió un error inesperado.\nIntenta nuevamente.';
}
