/// Trámite del listado cliente (`GET /api/cliente/tramites`).
class Tramite {
  const Tramite({
    required this.id,
    this.politicaId,
    this.politicaNombre,
    this.clienteNombre,
    required this.estado,
    this.pasoActual,
    this.totalPasos,
    this.creadoEn,
  });

  final String id;
  final String? politicaId;
  final String? politicaNombre;
  final String? clienteNombre;
  final String estado;
  final int? pasoActual;
  final int? totalPasos;
  final DateTime? creadoEn;

  factory Tramite.fromJson(Map<String, dynamic> json) {
    return Tramite(
      id: json['id'] as String? ?? '',
      politicaId: json['politicaId'] as String?,
      politicaNombre: json['politicaNombre'] as String?,
      clienteNombre: json['clienteNombre'] as String?,
      estado: (json['estado'] as String?) ?? 'INICIADO',
      pasoActual: (json['pasoActual'] as num?)?.toInt(),
      totalPasos: (json['totalPasos'] as num?)?.toInt(),
      creadoEn: _parseInstant(json['creadoEn']),
    );
  }

  static DateTime? _parseInstant(dynamic v) {
    if (v == null) return null;
    if (v is String) return DateTime.tryParse(v);
    return null;
  }
}

/// Respuesta de `GET /api/cliente/tramites/{id}/detalle`.
class TramiteDetalleResponse {
  const TramiteDetalleResponse({
    required this.tramite,
    required this.tareas,
  });

  final TramiteResumenDetalle tramite;
  final List<TareaDetalleItem> tareas;

  factory TramiteDetalleResponse.fromJson(Map<String, dynamic> json) {
    final tMap = json['tramite'] as Map<String, dynamic>? ?? {};
    final list = json['tareas'] as List<dynamic>? ?? [];
    return TramiteDetalleResponse(
      tramite: TramiteResumenDetalle.fromJson(tMap),
      tareas: list
          .map((e) => TareaDetalleItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TramiteResumenDetalle {
  const TramiteResumenDetalle({
    required this.id,
    this.politicaNombre,
    this.clienteNombre,
    required this.estado,
    this.pasoActual,
    this.totalPasos,
    this.creadoEn,
  });

  final String id;
  final String? politicaNombre;
  final String? clienteNombre;
  final String estado;
  final int? pasoActual;
  final int? totalPasos;
  final DateTime? creadoEn;

  factory TramiteResumenDetalle.fromJson(Map<String, dynamic> json) {
    return TramiteResumenDetalle(
      id: json['id'] as String? ?? '',
      politicaNombre: json['politicaNombre'] as String?,
      clienteNombre: json['clienteNombre'] as String?,
      estado: (json['estado'] as String?) ?? 'INICIADO',
      pasoActual: (json['pasoActual'] as num?)?.toInt(),
      totalPasos: (json['totalPasos'] as num?)?.toInt(),
      creadoEn: Tramite._parseInstant(json['creadoEn']),
    );
  }
}

/// Tarea dentro del detalle (timeline).
class TareaDetalleItem {
  const TareaDetalleItem({
    required this.id,
    this.actividadEtiqueta,
    this.departamentoTexto,
    required this.estado,
    this.creadoEn,
    this.completadoEn,
  });

  final String id;
  final String? actividadEtiqueta;
  final String? departamentoTexto;
  final String estado;
  final DateTime? creadoEn;
  final DateTime? completadoEn;

  factory TareaDetalleItem.fromJson(Map<String, dynamic> json) {
    return TareaDetalleItem(
      id: json['id'] as String? ?? '',
      actividadEtiqueta: json['actividadEtiqueta'] as String?,
      departamentoTexto: json['departamentoTexto'] as String?,
      estado: (json['estado'] as String?) ?? 'PENDIENTE',
      creadoEn: Tramite._parseInstant(json['creadoEn']),
      completadoEn: Tramite._parseInstant(json['completadoEn']),
    );
  }
}
