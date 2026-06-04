/// Política activa (`GET /api/cliente/politicas/activas`).
class RequisitoInicial {
  const RequisitoInicial({
    required this.id,
    required this.nombre,
    this.descripcion,
    this.tipoArchivo = 'cualquiera',
  });

  final String id;
  final String nombre;
  final String? descripcion;
  /// imagen | pdf | documento | cualquiera
  final String tipoArchivo;

  /// Valor normalizado para lógica de pickers.
  String get tipoArchivoEfectivo {
    switch (tipoArchivo.trim().toLowerCase()) {
      case 'imagen':
      case 'pdf':
      case 'documento':
        return tipoArchivo.trim().toLowerCase();
      default:
        return 'cualquiera';
    }
  }

  bool get permiteImagen =>
      tipoArchivoEfectivo == 'imagen' || tipoArchivoEfectivo == 'cualquiera';

  bool get permiteArchivoDocumento {
    final t = tipoArchivoEfectivo;
    return t == 'pdf' || t == 'documento' || t == 'cualquiera';
  }

  List<String> get extensionesFilePicker {
    switch (tipoArchivoEfectivo) {
      case 'pdf':
        return const ['pdf'];
      case 'documento':
        return const ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
      default:
        return const ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    }
  }

  factory RequisitoInicial.fromJson(Map<String, dynamic> json) {
    final rawTipo = json['tipoArchivo'] as String?;
    return RequisitoInicial(
      id: json['id'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String?,
      tipoArchivo: rawTipo == null || rawTipo.trim().isEmpty
          ? 'cualquiera'
          : rawTipo.trim(),
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
