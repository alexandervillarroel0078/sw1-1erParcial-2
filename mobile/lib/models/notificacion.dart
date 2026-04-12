/// Notificación del cliente (`GET /api/cliente/notificaciones`).
class Notificacion {
  const Notificacion({
    required this.id,
    required this.titulo,
    required this.mensaje,
    required this.leida,
    this.tramiteId,
    this.enviadoEn,
  });

  final String id;
  final String titulo;
  final String mensaje;
  final bool leida;
  final String? tramiteId;
  final DateTime? enviadoEn;

  factory Notificacion.fromJson(Map<String, dynamic> json) {
    return Notificacion(
      id: json['id'] as String? ?? '',
      titulo: json['titulo'] as String? ?? '',
      mensaje: json['mensaje'] as String? ?? '',
      leida: json['leida'] as bool? ?? false,
      tramiteId: json['tramiteId'] as String?,
      enviadoEn: _parseInstant(json['enviadoEn']),
    );
  }

  static DateTime? _parseInstant(dynamic v) {
    if (v == null) return null;
    if (v is String) return DateTime.tryParse(v);
    return null;
  }
}
