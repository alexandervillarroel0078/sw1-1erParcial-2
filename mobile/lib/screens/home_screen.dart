import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/notificacion.dart';
import '../providers/auth_provider.dart';
import '../services/local_notification_service.dart';
import '../services/notificacion_service.dart';
import 'notificaciones_screen.dart';
import 'tramites_screen.dart';

/// Contenedor principal: AppBar, [NavigationBar] y pestañas.
///
/// La pestaña activa sigue el query `?tab=0|1` en `/home`
/// (las rutas `/tramites` y `/notificaciones` redirigen con el tab correspondiente).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Timer? _pollTimer;
  bool _pollBaselineReady = false;
  Set<String> _knownSnapshotIds = {};

  @override
  void initState() {
    super.initState();
    final svc = context.read<NotificacionService>();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _pollTick(svc));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _pollTick(NotificacionService svc) async {
    try {
      final list = await svc.getNotificaciones();
      await _maybeShowNewUnreadLocals(list);
    } catch (_) {}
  }

  Future<void> _maybeShowNewUnreadLocals(List<Notificacion> list) async {
    if (!_pollBaselineReady) {
      _knownSnapshotIds = list.map((e) => e.id).toSet();
      _pollBaselineReady = true;
      return;
    }
    for (final n in list) {
      if (!_knownSnapshotIds.contains(n.id) && !n.leida) {
        await LocalNotificationService.show(n);
      }
    }
    _knownSnapshotIds = list.map((e) => e.id).toSet();
  }

  int _tabIndex(GoRouterState state) {
    final q = state.uri.queryParameters['tab'];
    final tab = int.tryParse(q ?? '0') ?? 0;
    return tab.clamp(0, 1);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final idx = _tabIndex(GoRouterState.of(context));

    return Scaffold(
      appBar: AppBar(
        title: Text(auth.nombreMostrado),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: IndexedStack(
        index: idx,
        children: const [
          TramitesScreen(),
          NotificacionesScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) {
          context.go(i == 0 ? '/home?tab=0' : '/home?tab=1');
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.folder_open_outlined),
            selectedIcon: Icon(Icons.folder_open),
            label: 'Mis Trámites',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Notificaciones',
          ),
        ],
      ),
    );
  }
}
