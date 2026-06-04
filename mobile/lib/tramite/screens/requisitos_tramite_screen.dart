import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../auth/services/auth_service.dart';
import '../../config/app_config.dart';
import '../../core/utils/error_utils.dart';
import '../../ia/services/ia_service.dart';
import '../../politica/models/politica.dart';
import '../services/documento_service.dart';
import '../services/tramite_service.dart';

/// Archivo seleccionado para un requisito (imagen o documento).
class _ArchivoRequisito {
  const _ArchivoRequisito({required this.path, required this.name});

  final String path;
  final String name;

  String get extension {
    final i = name.lastIndexOf('.');
    if (i < 0 || i >= name.length - 1) return '';
    return name.substring(i + 1).toLowerCase();
  }
}

String _extDeNombre(String filename) {
  if (!filename.contains('.')) return '';
  return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
}

bool _esImagen(String filename) {
  final ext = _extDeNombre(filename);
  return ext == 'jpg' ||
      ext == 'jpeg' ||
      ext == 'png' ||
      ext == 'heic' ||
      ext == 'webp';
}

bool _requiereValidacionIa(String filename) {
  final ext = _extDeNombre(filename);
  return _esImagen(filename) || ext == 'pdf';
}

/// Resultado de validación IA por requisito.
class _ValidacionRequisito {
  const _ValidacionRequisito({
    required this.estado,
    this.valido = false,
    this.confianza = 0,
    this.mensaje = '',
    this.confirmadoManual = false,
  });

  final _EstadoValidacionDoc estado;
  final bool valido;
  final int confianza;
  final String mensaje;
  final bool confirmadoManual;

  bool get listoParaContinuar {
    switch (estado) {
      case _EstadoValidacionDoc.ok:
        return valido && confianza >= 60;
      case _EstadoValidacionDoc.advertencia:
        return true;
      case _EstadoValidacionDoc.rechazado:
        return false;
      case _EstadoValidacionDoc.verificando:
      case _EstadoValidacionDoc.ninguno:
        return false;
    }
  }

  static const verificando = _ValidacionRequisito(
    estado: _EstadoValidacionDoc.verificando,
  );
}

enum _EstadoValidacionDoc {
  ninguno,
  verificando,
  ok,
  rechazado,
  advertencia,
}

String _contentTypeFor(String filename) {
  final ext = filename.contains('.')
      ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
      : '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

/// Requisitos iniciales antes de crear el trámite (archivos por requisito).
class RequisitosTramiteScreen extends StatefulWidget {
  const RequisitosTramiteScreen({
    super.key,
    required this.politica,
    required this.nombreCompleto,
    required this.telefono,
    this.email,
  });

  final Politica politica;
  final String nombreCompleto;
  final String telefono;
  final String? email;

  @override
  State<RequisitosTramiteScreen> createState() => _RequisitosTramiteScreenState();
}

class _RequisitosTramiteScreenState extends State<RequisitosTramiteScreen> {
  final ImagePicker _picker = ImagePicker();
  final Map<String, _ArchivoRequisito> _archivosPorRequisito = {};
  final Map<String, _ValidacionRequisito> _validacionPorRequisito = {};

  bool _creando = false;
  String? _errorGlobal;
  String? _pasoActual;

  List<RequisitoInicial> get _requisitos => widget.politica.requisitosIniciales;

  bool get _hayValidacionEnCurso =>
      _validacionPorRequisito.values.any(
        (v) => v.estado == _EstadoValidacionDoc.verificando,
      );

  bool _requisitoListo(String reqId) {
    if (!_archivosPorRequisito.containsKey(reqId)) return false;
    final archivo = _archivosPorRequisito[reqId]!;
    if (!_requiereValidacionIa(archivo.name)) return true;
    final v = _validacionPorRequisito[reqId];
    return v != null && v.listoParaContinuar;
  }

  bool get _todosSubidos {
    if (_requisitos.isEmpty) return true;
    if (_hayValidacionEnCurso) return false;
    for (final r in _requisitos) {
      if (!_requisitoListo(r.id)) return false;
    }
    return true;
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Future<void> _elegirImagen(RequisitoInicial req) async {
    if (_creando) return;
    try {
      final file = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      if (file == null || !mounted) return;
      final seleccionado = _ArchivoRequisito(
        path: file.path,
        name: file.name,
      );
      setState(() {
        _archivosPorRequisito[req.id] = seleccionado;
        _validacionPorRequisito.remove(req.id);
      });
      await _validarArchivoSeleccionado(req, seleccionado);
    } catch (_) {
      _snack('No se pudo abrir la cámara.');
    }
  }

  Future<void> _elegirArchivo(RequisitoInicial req) async {
    if (_creando) return;
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: req.extensionesFilePicker,
      );
      if (result == null || result.files.isEmpty || !mounted) return;
      final picked = result.files.single;
      final path = picked.path;
      if (path == null || path.isEmpty) {
        _snack('No se pudo leer el archivo seleccionado.');
        return;
      }
      final seleccionado = _ArchivoRequisito(
        path: path,
        name: picked.name,
      );
      setState(() {
        _archivosPorRequisito[req.id] = seleccionado;
        _validacionPorRequisito.remove(req.id);
      });
      await _validarArchivoSeleccionado(req, seleccionado);
    } catch (_) {
      _snack('No se pudo abrir el selector de archivos.');
    }
  }

  Future<void> _validarArchivoSeleccionado(
    RequisitoInicial req,
    _ArchivoRequisito archivo,
  ) async {
    if (!_requiereValidacionIa(archivo.name)) {
      setState(() => _validacionPorRequisito.remove(req.id));
      return;
    }

    setState(() {
      _validacionPorRequisito[req.id] = _ValidacionRequisito.verificando;
    });

    try {
      final res = await context.read<IaService>().validarDocumento(
            archivo.path,
            req.nombre,
          );
      if (!mounted) return;

      final valido = res['valido'] == true;
      final confianza = (res['confianza'] is num)
          ? (res['confianza'] as num).round()
          : int.tryParse('${res['confianza']}') ?? 0;
      final mensaje = (res['mensaje'] as String?)?.trim() ?? '';

      if (valido && confianza >= 60) {
        setState(() {
          _validacionPorRequisito[req.id] = _ValidacionRequisito(
            estado: _EstadoValidacionDoc.ok,
            valido: true,
            confianza: confianza,
            mensaje: mensaje,
          );
        });
        return;
      }

      if (!valido && confianza >= 60) {
        final detalle = mensaje.isNotEmpty
            ? mensaje
            : 'No coincide con el requisito solicitado';
        setState(() {
          _archivosPorRequisito.remove(req.id);
          _validacionPorRequisito[req.id] = _ValidacionRequisito(
            estado: _EstadoValidacionDoc.rechazado,
            confianza: confianza,
            mensaje:
                'Documento incorrecto: $detalle. Por favor sube el documento correcto.',
          );
        });
        return;
      }

      final subirIgual = await _preguntarIncertidumbre();
      if (!mounted) return;
      if (subirIgual) {
        setState(() {
          _validacionPorRequisito[req.id] = _ValidacionRequisito(
            estado: _EstadoValidacionDoc.advertencia,
            valido: valido,
            confianza: confianza,
            mensaje: mensaje.isNotEmpty
                ? mensaje
                : 'Subida confirmada sin verificación completa.',
            confirmadoManual: true,
          );
        });
      } else {
        setState(() {
          _archivosPorRequisito.remove(req.id);
          _validacionPorRequisito.remove(req.id);
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _validacionPorRequisito[req.id] = const _ValidacionRequisito(
          estado: _EstadoValidacionDoc.advertencia,
          mensaje:
              'No se pudo verificar, puedes continuar',
        );
      });
    }
  }

  Future<bool> _preguntarIncertidumbre() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Verificación incierta'),
        content: const Text(
          '⚠️ No se pudo verificar con certeza. ¿Deseas subir de todas formas?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sí'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Future<List<int>> _bytesParaSubir(_ArchivoRequisito archivo) async {
    if (_esImagen(archivo.name)) {
      final compressedBytes = await FlutterImageCompress.compressWithFile(
        archivo.path,
        quality: 60,
        minWidth: 800,
        minHeight: 800,
      );
      return compressedBytes ?? await File(archivo.path).readAsBytes();
    }
    return File(archivo.path).readAsBytes();
  }

  Future<void> _crearTramite() async {
    if (!_todosSubidos || _creando) return;

    final nodoStartId = widget.politica.nodoStartId;
    if (_requisitos.isNotEmpty &&
        (nodoStartId == null || nodoStartId.isEmpty)) {
      _snack('La política no define un nodo de inicio válido.');
      return;
    }

    setState(() {
      _creando = true;
      _errorGlobal = null;
      _pasoActual = 'Creando trámite…';
    });

    final tramiteService = context.read<TramiteService>();
    final documentoService =
        DocumentoService(context.read<AuthService>());

    try {
      final tramite = await tramiteService.crearTramite(
        politicaId: widget.politica.id,
        nombreCompleto: widget.nombreCompleto,
        telefono: widget.telefono,
        email: widget.email,
      );

      if (_requisitos.isNotEmpty && nodoStartId != null) {
        for (var i = 0; i < _requisitos.length; i++) {
          final req = _requisitos[i];
          final archivo = _archivosPorRequisito[req.id];
          if (archivo == null) continue;
          if (!mounted) return;
          setState(() {
            _pasoActual =
                'Subiendo ${i + 1} de ${_requisitos.length}: ${req.nombre}…';
          });
          final bytes = await _bytesParaSubir(archivo);
          await documentoService.subirArchivo(
            tramiteId: tramite.id,
            nodoId: nodoStartId,
            fileBytes: bytes,
            filename: archivo.name,
            contentType: _contentTypeFor(archivo.name),
          );
        }
      }

      if (!mounted) return;
      _snack('Trámite creado correctamente');
      context.go('/home?tab=0');
    } on TramiteApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _creando = false;
        _errorGlobal = mensajeErrorAmigable(e.message);
        _pasoActual = null;
      });
      _snack('No se pudo crear el trámite. Intente de nuevo.');
    } on DocumentoApiException catch (e) {
      if (!mounted) return;
      final detalle = mensajeErrorAmigable(e.message);
      setState(() {
        _creando = false;
        _errorGlobal =
            'Trámite creado, pero falló la subida de archivos.\n$detalle';
        _pasoActual = null;
      });
      _snack(_errorGlobal!);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _creando = false;
        _errorGlobal = mensajeErrorAmigable(e.toString());
        _pasoActual = null;
      });
      _snack('No se pudo completar la operación.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Requisitos del trámite'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _creando ? null : () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.politica.nombre,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Subí un archivo por cada requisito para continuar.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          if (_errorGlobal != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Material(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _errorGlobal!,
                    style: TextStyle(color: theme.colorScheme.onErrorContainer),
                  ),
                ),
              ),
            ),
          Expanded(
            child: _requisitos.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'Esta política no tiene requisitos iniciales.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyLarge,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: _requisitos.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final req = _requisitos[index];
                      final archivo = _archivosPorRequisito[req.id];
                      final validacion = _validacionPorRequisito[req.id];
                      return _RequisitoCard(
                        requisito: req,
                        archivo: archivo,
                        validacion: validacion,
                        creando: _creando,
                        onSubirImagen: () => _elegirImagen(req),
                        onSubirArchivo: () => _elegirArchivo(req),
                      );
                    },
                  ),
          ),
          if (_creando && _pasoActual != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _pasoActual!,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: FilledButton.icon(
                onPressed: (_todosSubidos && !_creando) ? _crearTramite : null,
                icon: _creando
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.check_circle_outline),
                label: Text(_creando ? 'Procesando…' : 'Crear trámite'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: const Color(AppConfig.primaryColorValue),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RequisitoCard extends StatelessWidget {
  const _RequisitoCard({
    required this.requisito,
    required this.archivo,
    required this.validacion,
    required this.creando,
    required this.onSubirImagen,
    required this.onSubirArchivo,
  });

  final RequisitoInicial requisito;
  final _ArchivoRequisito? archivo;
  final _ValidacionRequisito? validacion;
  final bool creando;
  final VoidCallback onSubirImagen;
  final VoidCallback onSubirArchivo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subido = archivo != null;
    final verificando =
        validacion?.estado == _EstadoValidacionDoc.verificando;
    final bloquearBotones = creando || verificando;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  requisito.nombre,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (requisito.descripcion != null &&
                    requisito.descripcion!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    requisito.descripcion!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
            if (verificando) ...[
              const SizedBox(height: 10),
              const Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text('Verificando documento…'),
                  ),
                ],
              ),
            ],
            if (validacion != null &&
                !verificando &&
                (subido || validacion!.estado == _EstadoValidacionDoc.rechazado)) ...[
              const SizedBox(height: 8),
              _ValidacionBanner(validacion: validacion!),
            ],
            if (subido) ...[
              const SizedBox(height: 10),
              _ArchivoPreview(archivo: archivo!),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (requisito.permiteImagen)
                  OutlinedButton(
                    onPressed: bloquearBotones ? null : onSubirImagen,
                    child: const Text('📷 Subir imagen'),
                  ),
                if (requisito.permiteArchivoDocumento)
                  OutlinedButton(
                    onPressed: bloquearBotones ? null : onSubirArchivo,
                    child: Text(
                      requisito.tipoArchivoEfectivo == 'pdf'
                          ? '📄 Subir PDF'
                          : '📁 Subir archivo',
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ValidacionBanner extends StatelessWidget {
  const _ValidacionBanner({required this.validacion});

  final _ValidacionRequisito validacion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Color bg;
    Color fg;
    String prefix;
    switch (validacion.estado) {
      case _EstadoValidacionDoc.ok:
        bg = Colors.green.shade50;
        fg = Colors.green.shade900;
        prefix = '✅';
        break;
      case _EstadoValidacionDoc.rechazado:
        bg = Colors.red.shade50;
        fg = Colors.red.shade900;
        prefix = '❌';
        break;
      case _EstadoValidacionDoc.advertencia:
        bg = Colors.amber.shade50;
        fg = Colors.amber.shade900;
        prefix = '⚠️';
        break;
      default:
        return const SizedBox.shrink();
    }
    final msg = validacion.mensaje.isNotEmpty
        ? validacion.mensaje
        : (validacion.estado == _EstadoValidacionDoc.advertencia
            ? 'No se pudo verificar, puedes continuar'
            : 'Documento incorrecto. Por favor sube el documento correcto.');
    final texto = validacion.estado == _EstadoValidacionDoc.rechazado
        ? '❌ $msg'
        : '$prefix $msg';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.35)),
      ),
      child: Text(
        texto,
        style: theme.textTheme.bodySmall?.copyWith(color: fg),
      ),
    );
  }
}

class _ArchivoPreview extends StatelessWidget {
  const _ArchivoPreview({required this.archivo});

  final _ArchivoRequisito archivo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ext = archivo.extension;
    final esImagen = _esImagen(archivo.name);

    Widget leading;
    if (esImagen) {
      leading = ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.file(
          File(archivo.path),
          width: 56,
          height: 56,
          fit: BoxFit.cover,
        ),
      );
    } else if (ext == 'pdf') {
      leading = const Icon(
        Icons.picture_as_pdf,
        size: 40,
        color: Colors.red,
      );
    } else if (ext == 'doc' || ext == 'docx') {
      leading = const Icon(
        Icons.description,
        size: 40,
        color: Colors.blue,
      );
    } else if (ext == 'xls' || ext == 'xlsx') {
      leading = const Icon(
        Icons.table_view,
        size: 40,
        color: Colors.green,
      );
    } else {
      leading = Icon(
        Icons.insert_drive_file_outlined,
        size: 40,
        color: theme.colorScheme.primary,
      );
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              archivo.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}
