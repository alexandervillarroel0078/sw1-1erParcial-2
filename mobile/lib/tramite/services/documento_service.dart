import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../../auth/services/auth_service.dart';
import '../../config/app_config.dart';

/// Subida de documentos del trámite (`POST /api/documentos/...`).
class DocumentoService {
  DocumentoService(this._auth);

  final AuthService _auth;

  /// `POST /api/documentos/tramite/{tramiteId}/nodo/{nodoId}/upload`
  Future<void> subirArchivo({
    required String tramiteId,
    required String nodoId,
    required List<int> fileBytes,
    required String filename,
    String? contentType,
  }) async {
    final uri = Uri.parse(
      '${AppConfig.baseUrl}/documentos/tramite/$tramiteId/nodo/$nodoId/upload',
    );
    final token = _auth.getToken();
    final request = http.MultipartRequest('POST', uri);
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.headers['Accept'] = 'application/json';
    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: filename,
        contentType: contentType != null && contentType.isNotEmpty
            ? MediaType.parse(contentType)
            : null,
      ),
    );
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String msg = 'Error ${res.statusCode}';
      try {
        final m = jsonDecode(res.body);
        if (m is Map && m['message'] != null) msg = '${m['message']}';
      } catch (_) {}
      throw DocumentoApiException(msg, res.statusCode);
    }
  }
}

class DocumentoApiException implements Exception {
  DocumentoApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}
