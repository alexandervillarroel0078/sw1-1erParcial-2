import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import 'notificaciones_screen.dart';
import 'tramites_screen.dart';

/// Contenedor principal: AppBar, [NavigationBar] y pestañas.
///
/// La pestaña activa sigue el query `?tab=0|1` en `/home`
/// (las rutas `/tramites` y `/notificaciones` redirigen con el tab correspondiente).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

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
