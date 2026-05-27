/// Política activa (`GET /api/cliente/politicas/activas`).
class RequisitoInicial {
  const RequisitoInicial({
    required this.id,
    required this.nombre,
    this.descripcion,
  });

  final String id;
  final String nombre;
  final String? descripcion;

  factory RequisitoInicial.fromJson(Map<String, dynamic> json) {
    return RequisitoInicial(
      id: json['id'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String?,
    );
  }
}

class Politica {
  const Politica({
    required this.id,
    required this.nombre,
    this.subtitulo,
    this.activa = true,
    this.requisitosIniciales = const [],
    this.nodoStartId,
  });

  final String id;
  final String nombre;
  final String? subtitulo;
  final bool activa;
  final List<RequisitoInicial> requisitosIniciales;
  /// Id del nodo START en el diagrama (para subida de documentos).
  final String? nodoStartId;

  factory Politica.fromJson(Map<String, dynamic> json) {
    var requisitos = _parseRequisitosList(json['requisitosIniciales']);
    String? nodoStartId;

    final nodos = json['nodos'];
    if (nodos is List) {
      for (final raw in nodos) {
        if (raw is! Map<String, dynamic>) continue;
        final tipo = (raw['tipo'] as String?)?.toUpperCase();
        if (tipo != 'START') continue;
        nodoStartId = raw['id'] as String?;
        if (requisitos.isEmpty) {
          requisitos = _parseRequisitosList(raw['requisitosIniciales']);
        }
        break;
      }
    }

    return Politica(
      id: json['id'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      subtitulo: json['subtitulo'] as String?,
      activa: json['activa'] as bool? ?? true,
      requisitosIniciales: requisitos,
      nodoStartId: nodoStartId,
    );
  }

  static List<RequisitoInicial> _parseRequisitosList(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(RequisitoInicial.fromJson)
        .where((r) => r.id.isNotEmpty && r.nombre.isNotEmpty)
        .toList();
  }

  Map<String, String> toIaItem() => {
        'id': id,
        'nombre': nombre,
        'descripcion': subtitulo ?? '',
      };
}
