import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../auth/providers/auth_provider.dart';
import '../../config/app_config.dart';
import '../../core/utils/error_utils.dart';
import '../../ia/services/ia_service.dart';
import '../../politica/models/politica.dart';
import '../../politica/services/politica_service.dart';
import 'requisitos_tramite_screen.dart';

/// Iniciar trámite: voz → sugerencia IA → confirmación.
class NuevoTramiteScreen extends StatefulWidget {
  const NuevoTramiteScreen({super.key});

  @override
  State<NuevoTramiteScreen> createState() => _NuevoTramiteScreenState();
}

class _NuevoTramiteScreenState extends State<NuevoTramiteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final SpeechToText _speech = SpeechToText();

  List<Politica> _politicas = [];
  bool _cargandoPoliticas = true;
  String? _errorPoliticas;

  bool _vozDisponible = false;
  bool _escuchando = false;
  String _transcript = '';
  String _acumuladoFinal = '';

  bool _sugiriendo = false;
  String? _justificacion;
  String? _politicaIdSeleccionada;
  bool _mostrarSelectorManual = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _prefillCliente();
      _cargarPoliticas();
    });
    _initVoz();
  }

  void _prefillCliente() {
    final cliente = context.read<AuthProvider>().cliente;
    if (cliente == null) return;
    _nombreCtrl.text = cliente.nombreCompleto;
    if (cliente.telefono != null && cliente.telefono!.isNotEmpty) {
      _telefonoCtrl.text = cliente.telefono!;
    }
    if (cliente.email != null && cliente.email!.isNotEmpty) {
      _emailCtrl.text = cliente.email!;
    }
  }

  Future<void> _initVoz() async {
    final ok = await _speech.initialize(
      onError: (_) {
        if (!mounted) return;
        setState(() => _escuchando = false);
        _snack('Error al capturar voz. Intente de nuevo.');
      },
    );
    if (mounted) setState(() => _vozDisponible = ok);
  }

  Future<void> _cargarPoliticas() async {
    setState(() {
      _cargandoPoliticas = true;
      _errorPoliticas = null;
    });
    try {
      final lista =
          await context.read<PoliticaService>().getPoliticasActivas();
      if (!mounted) return;
      setState(() {
        _politicas = lista;
        _cargandoPoliticas = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _cargandoPoliticas = false;
        _errorPoliticas = mensajeErrorAmigable(e.toString());
      });
      _snack('No se pudieron cargar las políticas activas.');
    }
  }

  Politica? get _politicaSeleccionada {
    final id = _politicaIdSeleccionada;
    if (id == null || id.isEmpty) return null;
    for (final p in _politicas) {
      if (p.id == id) return p;
    }
    return null;
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Future<void> _toggleVoz() async {
    if (!_vozDisponible) {
      _snack('El reconocimiento de voz no está disponible en este dispositivo.');
      return;
    }
    if (_escuchando) {
      await _speech.stop();
      final textoFinal = '$_acumuladoFinal $_transcript'.trim();
      setState(() {
        _escuchando = false;
        _transcript = textoFinal;
      });
      if (textoFinal.length >= 10) {
        await _sugerirPoliticaDesdeTexto(textoFinal);
      } else if (textoFinal.isNotEmpty) {
        _snack('Describe mejor la situación');
      } else {
        _snack('No se captó texto. Intente de nuevo.');
      }
      return;
    }

    setState(() {
      _acumuladoFinal = '';
      _transcript = '';
      _justificacion = null;
      _escuchando = true;
    });

    await _speech.listen(
      onResult: _onSpeechResult,
      localeId: 'es_ES',
      listenFor: const Duration(seconds: 120),
      pauseFor: const Duration(seconds: 5),
      listenOptions: SpeechListenOptions(partialResults: true),
    );
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (!mounted) return;
    setState(() {
      if (result.finalResult) {
        _acumuladoFinal = '$_acumuladoFinal ${result.recognizedWords}'.trim();
      }
      final interim = result.finalResult ? '' : result.recognizedWords;
      _transcript = '$_acumuladoFinal $interim'.trim();
    });
  }

  Future<void> _sugerirPoliticaDesdeTexto(String texto) async {
    if (_politicas.isEmpty) {
      _snack('No hay políticas activas disponibles.');
      return;
    }
    setState(() {
      _sugiriendo = true;
      _justificacion = null;
      _mostrarSelectorManual = false;
    });
    try {
      final res = await context.read<IaService>().sugerirPolitica(
            textoVoz: texto,
            politicas: _politicas.map((p) => p.toIaItem()).toList(),
          );
      if (!mounted) return;
      setState(() {
        _sugiriendo = false;
        _transcript = '';
        _justificacion = res.justificacion;
        if (res.politicaId != null &&
            _politicas.any((p) => p.id == res.politicaId)) {
          _politicaIdSeleccionada = res.politicaId;
          _mostrarSelectorManual = false;
          _snack('Política sugerida automáticamente');
        } else {
          _politicaIdSeleccionada = null;
          _mostrarSelectorManual = true;
          _snack(
            'No se encontró política adecuada. Seleccione una manualmente.',
          );
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sugiriendo = false;
        _transcript = '';
        _mostrarSelectorManual = true;
      });
      _snack('No se pudo sugerir política. Elige manualmente.');
    }
  }

  Future<void> _confirmar() async {
    if (!_formKey.currentState!.validate()) return;
    final pol = _politicaSeleccionada;
    if (pol == null) {
      _snack('Debe seleccionar una política.');
      return;
    }
    final emailTrim = _emailCtrl.text.trim();
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => RequisitosTramiteScreen(
          politica: pol,
          nombreCompleto: _nombreCtrl.text.trim(),
          telefono: _telefonoCtrl.text.trim(),
          email: emailTrim.isEmpty ? null : emailTrim,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _speech.stop();
    _nombreCtrl.dispose();
    _telefonoCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pol = _politicaSeleccionada;
    final mostrarDropdown =
        _mostrarSelectorManual || _politicaIdSeleccionada == null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuevo trámite'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: _cargandoPoliticas
          ? const Center(child: CircularProgressIndicator())
          : _errorPoliticas != null && _politicas.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_errorPoliticas!,
                            textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _cargarPoliticas,
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Describe tu situación',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Center(
                          child: Column(
                            children: [
                              Material(
                                color: _escuchando
                                    ? theme.colorScheme.errorContainer
                                    : theme.colorScheme.primaryContainer,
                                shape: const CircleBorder(),
                                elevation: _escuchando ? 6 : 2,
                                child: InkWell(
                                  customBorder: const CircleBorder(),
                                  onTap: _sugiriendo ? null : _toggleVoz,
                                  child: SizedBox(
                                    width: 96,
                                    height: 96,
                                    child: Icon(
                                      _escuchando
                                          ? Icons.mic_rounded
                                          : Icons.mic_none_rounded,
                                      size: 48,
                                      color: _escuchando
                                          ? theme.colorScheme.onErrorContainer
                                          : theme
                                              .colorScheme.onPrimaryContainer,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _escuchando
                                    ? 'Toca para detener'
                                    : 'Describir situación por voz',
                                style: theme.textTheme.labelLarge,
                              ),
                            ],
                          ),
                        ),
                        if (_transcript.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '🎙️ $_transcript',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                        ],
                        if (_sugiriendo) ...[
                          const SizedBox(height: 24),
                          const Center(child: CircularProgressIndicator()),
                          const SizedBox(height: 8),
                          const Center(
                            child: Text('Analizando tu descripción…'),
                          ),
                        ],
                        if (_justificacion != null &&
                            _justificacion!.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Text(
                            '💡 $_justificacion',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                        if (pol != null && !_mostrarSelectorManual) ...[
                          const SizedBox(height: 16),
                          _PoliticaSugeridaCard(politica: pol),
                        ],
                        if (mostrarDropdown) ...[
                          const SizedBox(height: 20),
                          DropdownButtonFormField<String>(
                            value: _politicaIdSeleccionada != null &&
                                    _politicas.any(
                                      (p) => p.id == _politicaIdSeleccionada,
                                    )
                                ? _politicaIdSeleccionada
                                : null,
                            decoration: const InputDecoration(
                              labelText: 'Política activa',
                              hintText: 'Elija una política',
                            ),
                            items: _politicas
                                .map(
                                  (p) => DropdownMenuItem(
                                    value: p.id,
                                    child: Text(p.nombre),
                                  ),
                                )
                                .toList(),
                            onChanged: _sugiriendo
                                ? null
                                : (v) => setState(
                                      () => _politicaIdSeleccionada = v,
                                    ),
                            validator: (v) =>
                                v == null || v.isEmpty
                                    ? 'Seleccione una política'
                                    : null,
                          ),
                        ],
                        const SizedBox(height: 28),
                        Text(
                          'Datos del cliente',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _nombreCtrl,
                          enabled: false,
                          decoration: const InputDecoration(
                            labelText: 'Nombre completo',
                          ),
                          textInputAction: TextInputAction.next,
                          validator: (v) {
                            if (v == null || v.trim().length < 2) {
                              return 'El nombre completo es obligatorio';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _telefonoCtrl,
                          enabled: false,
                          decoration: const InputDecoration(
                            labelText: 'Teléfono',
                          ),
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                          validator: (v) {
                            if (v == null || v.trim().length < 6) {
                              return 'El teléfono es obligatorio';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _emailCtrl,
                          enabled: false,
                          decoration: const InputDecoration(
                            labelText: 'Email (opcional)',
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (v) {
                            final t = v?.trim() ?? '';
                            if (t.isEmpty) return null;
                            if (!t.contains('@')) {
                              return 'Ingrese un email válido';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 28),
                        FilledButton.icon(
                          onPressed: _sugiriendo ? null : _confirmar,
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Confirmar y crear trámite'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            backgroundColor:
                                const Color(AppConfig.primaryColorValue),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}

class _PoliticaSugeridaCard extends StatelessWidget {
  const _PoliticaSugeridaCard({required this.politica});

  final Politica politica;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Política sugerida',
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            politica.nombre,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (politica.subtitulo != null &&
              politica.subtitulo!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              politica.subtitulo!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
