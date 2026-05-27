import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../auth/services/auth_service.dart';
import '../../config/app_config.dart';
import '../../politica/models/politica.dart';
import '../services/documento_service.dart';
import '../services/tramite_service.dart';

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
  final Map<String, XFile> _archivosPorRequisito = {};

  bool _creando = false;
  String? _errorGlobal;
  String? _pasoActual;

  List<RequisitoInicial> get _requisitos => widget.politica.requisitosIniciales;

  bool get _todosSubidos {
    if (_requisitos.isEmpty) return true;
    for (final r in _requisitos) {
      if (!_archivosPorRequisito.containsKey(r.id)) return false;
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
      setState(() => _archivosPorRequisito[req.id] = file);
    } catch (_) {
      _snack('No se pudo abrir la cámara.');
    }
  }

  Future<void> _elegirArchivo(RequisitoInicial req) async {
    if (_creando) return;
    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (file == null || !mounted) return;
      setState(() => _archivosPorRequisito[req.id] = file);
    } catch (_) {
      _snack('No se pudo abrir la galería.');
    }
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
          final compressedBytes = await FlutterImageCompress.compressWithFile(
            archivo.path,
            quality: 60,
            minWidth: 800,
            minHeight: 800,
          );
          final bytes =
              compressedBytes ?? await archivo.readAsBytes();
          await documentoService.subirArchivo(
            tramiteId: tramite.id,
            nodoId: nodoStartId,
            fileBytes: bytes,
            filename: archivo.name,
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
        _errorGlobal = e.message;
        _pasoActual = null;
      });
      _snack('No se pudo crear el trámite. Intente de nuevo.');
    } on DocumentoApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _creando = false;
        _errorGlobal =
            'Trámite creado, pero falló la subida de archivos: ${e.message}';
        _pasoActual = null;
      });
      _snack(_errorGlobal!);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _creando = false;
        _errorGlobal = 'Ocurrió un error inesperado.';
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
                      return _RequisitoCard(
                        requisito: req,
                        archivo: archivo,
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
    required this.creando,
    required this.onSubirImagen,
    required this.onSubirArchivo,
  });

  final RequisitoInicial requisito;
  final XFile? archivo;
  final bool creando;
  final VoidCallback onSubirImagen;
  final VoidCallback onSubirArchivo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final subido = archivo != null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
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
                ),
                if (subido)
                  const Text(
                    '✅',
                    style: TextStyle(fontSize: 22),
                  ),
              ],
            ),
            if (subido) ...[
              const SizedBox(height: 10),
              _ArchivoPreview(archivo: archivo!),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: creando ? null : onSubirImagen,
                  child: const Text('📷 Subir imagen'),
                ),
                OutlinedButton(
                  onPressed: creando ? null : onSubirArchivo,
                  child: const Text('📁 Subir archivo'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ArchivoPreview extends StatelessWidget {
  const _ArchivoPreview({required this.archivo});

  final XFile archivo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final path = archivo.path;
    final lower = path.toLowerCase();
    final esImagen = lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.heic');

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          if (esImagen)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(
                File(path),
                width: 56,
                height: 56,
                fit: BoxFit.cover,
              ),
            )
          else
            Icon(
              Icons.insert_drive_file_outlined,
              size: 40,
              color: theme.colorScheme.primary,
            ),
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
