import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

/// Respuesta de `POST /api/ia/sugerir-politica` (ia-service).
class SugerenciaPolitica {
  const SugerenciaPolitica({
    this.politicaId,
    required this.justificacion,
  });

  final String? politicaId;
  final String justificacion;

  factory SugerenciaPolitica.fromJson(Map<String, dynamic> json) {
    final raw = json['politicaId'];
    final id = raw == null || (raw is String && raw.isEmpty)
        ? null
        : raw.toString();
    return SugerenciaPolitica(
      politicaId: id,
      justificacion: json['justificacion'] as String? ?? '',
    );
  }
}

/// Cliente HTTP al microservicio de IA.
class IaService {
  /// `POST ${AppConfig.iaUrl}/ia/sugerir-politica`
  Future<SugerenciaPolitica> sugerirPolitica({
    required String textoVoz,
    required List<Map<String, String>> politicas,
  }) async {
    final uri = Uri.parse('${AppConfig.iaUrl}/ia/sugerir-politica');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: jsonEncode({
        'textoVoz': textoVoz.trim(),
        'politicas': politicas
            .map(
              (p) => {
                'id': p['id'] ?? '',
                'nombre': p['nombre'] ?? '',
                'descripcion': p['descripcion'] ?? '',
              },
            )
            .toList(),
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw IaApiException(_mensajeError(res), res.statusCode);
    }
    return SugerenciaPolitica.fromJson(
      jsonDecode(res.body) as Map<String, dynamic>,
    );
  }

  /// `POST ${AppConfig.iaUrl}/ia/validar-documento` (multipart).
  Future<Map<String, dynamic>> validarDocumento(
    String rutaArchivo,
    String nombreRequisito,
  ) async {
    final uri = Uri.parse('${AppConfig.iaUrl}/ia/validar-documento');
    final request = http.MultipartRequest('POST', uri);
    request.fields['nombre_requisito'] = nombreRequisito.trim();
    request.files.add(
      await http.MultipartFile.fromPath('archivo', rutaArchivo),
    );
    final streamed = await request.send().timeout(
      const Duration(seconds: 90),
      onTimeout: () {
        throw IaApiException('Tiempo de espera agotado al validar documento', 408);
      },
    );
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw IaApiException(_mensajeError(res), res.statusCode);
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return map;
  }

  String _mensajeError(http.Response res) {
    try {
      final m = jsonDecode(res.body);
      if (m is Map && m['detail'] != null) return '${m['detail']}';
    } catch (_) {}
    return 'Error ${res.statusCode}';
  }
}

class IaApiException implements Exception {
  IaApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
