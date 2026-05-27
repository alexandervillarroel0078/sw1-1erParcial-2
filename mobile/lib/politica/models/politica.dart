/// Política activa (`GET /api/cliente/politicas/activas`).
class Politica {
  const Politica({
    required this.id,
    required this.nombre,
    this.subtitulo,
    this.activa = true,
  });

  final String id;
  final String nombre;
  final String? subtitulo;
  final bool activa;

  factory Politica.fromJson(Map<String, dynamic> json) {
    return Politica(
      id: json['id'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      subtitulo: json['subtitulo'] as String?,
      activa: json['activa'] as bool? ?? true,
    );
  }

  Map<String, String> toIaItem() => {
        'id': id,
        'nombre': nombre,
        'descripcion': subtitulo ?? '',
      };
}
