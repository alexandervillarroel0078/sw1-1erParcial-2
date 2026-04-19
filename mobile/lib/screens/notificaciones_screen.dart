import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/notificacion.dart';
import '../services/local_notification_service.dart';
import '../services/notificacion_service.dart';

/// Listado de notificaciones del cliente.
class NotificacionesScreen extends StatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  State<NotificacionesScreen> createState() => _NotificacionesScreenState();
}

class _NotificacionesScreenState extends State<NotificacionesScreen> {
  bool _loading = true;
  Object? _error;
  List<Notificacion> _notificaciones = [];

  Timer? _pollTimer;
  bool _baselineReady = false;
  Set<String> _knownSnapshotIds = {};

  @override
  void initState() {
    super.initState();
    final svc = context.read<NotificacionService>();
    _loadInitial(svc);
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _tick(svc));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadInitial(NotificacionService svc) async {
    try {
      final data = await svc.getNotificaciones();
      await _applyFetched(data);
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = null;
        _notificaciones = data;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
        _notificaciones = [];
      });
    }
  }

  Future<void> _tick(NotificacionService svc) async {
    try {
      final data = await svc.getNotificaciones();
      await _applyFetched(data);
      if (!mounted) return;
      setState(() {
        _notificaciones = data;
      });
    } catch (_) {}
  }

  Future<void> _applyFetched(List<Notificacion> list) async {
    if (!_baselineReady) {
      _knownSnapshotIds = list.map((e) => e.id).toSet();
      _baselineReady = true;
      return;
    }
    for (final n in list) {
      if (!_knownSnapshotIds.contains(n.id) && !n.leida) {
        await LocalNotificationService.show(n);
      }
    }
    _knownSnapshotIds = list.map((e) => e.id).toSet();
  }

  Future<void> _reload() async {
    final svc = context.read<NotificacionService>();
    try {
      final data = await svc.getNotificaciones();
      await _applyFetched(data);
      if (!mounted) return;
      setState(() {
        _error = null;
        _notificaciones = data;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
      });
    }
  }

  String _fecha(Notificacion n) {
    final d = n.enviadoEn?.toLocal();
    if (d == null) return '—';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} '
        '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _onTap(Notificacion n) async {
    if (n.leida) return;
    try {
      await context.read<NotificacionService>().marcarLeida(n.id);
      await _reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _reload,
      child: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) {
      return ListView(
        children: const [
          SizedBox(height: 120),
          Center(child: CircularProgressIndicator()),
        ],
      );
    }
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'No se pudieron cargar las notificaciones.\n$_error',
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(height: 16),
          FilledButton.tonal(
            onPressed: () {
              setState(() {
                _loading = true;
                _error = null;
              });
              _loadInitial(context.read<NotificacionService>());
            },
            child: const Text('Reintentar'),
          ),
        ],
      );
    }
    if (_notificaciones.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          Center(child: Text('No hay notificaciones.')),
        ],
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: _notificaciones.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final n = _notificaciones[i];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _onTap(n),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          n.titulo,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      if (!n.leida)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Nueva',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    n.mensaje,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _fecha(n),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
