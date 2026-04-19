import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'config/app_config.dart';
import 'providers/auth_provider.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/tramite_detalle_screen.dart';
import 'services/auth_service.dart';
import 'services/local_notification_service.dart';
import 'services/notificacion_service.dart';
import 'services/tramite_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalNotificationService.init();
  final prefs = await SharedPreferences.getInstance();
  final authService = AuthService(prefs);
  runApp(WorkflowApp(authService: authService));
}

/// Raíz de la app: tema M3, [Provider] y [go_router].
class WorkflowApp extends StatefulWidget {
  const WorkflowApp({super.key, required this.authService});

  final AuthService authService;

  @override
  State<WorkflowApp> createState() => _WorkflowAppState();
}

class _WorkflowAppState extends State<WorkflowApp> {
  late final AuthProvider _authProvider;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider(widget.authService)..hydrateFromStorage();

    _router = GoRouter(
      initialLocation: _authProvider.isLoggedIn ? '/home' : '/login',
      refreshListenable: _authProvider,
      redirect: (context, state) {
        final loggedIn = _authProvider.isLoggedIn;
        final path = state.uri.path;
        if (!loggedIn && path != '/login') {
          return '/login';
        }
        if (loggedIn && path == '/login') {
          return '/home';
        }
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/tramites',
          redirect: (context, state) => '/home?tab=0',
        ),
        GoRoute(
          path: '/notificaciones',
          redirect: (context, state) => '/home?tab=1',
        ),
        GoRoute(
          path: '/detalle/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return TramiteDetalleScreen(id: id);
          },
        ),
      ],
    );
  }

  ThemeData _buildTheme() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(AppConfig.primaryColorValue),
        brightness: Brightness.light,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(14)),
        ),
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(base.textTheme),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>.value(value: widget.authService),
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ProxyProvider<AuthService, TramiteService>(
          update: (_, auth, __) => TramiteService(auth),
        ),
        ProxyProvider<AuthService, NotificacionService>(
          update: (_, auth, __) => NotificacionService(auth),
        ),
      ],
      child: MaterialApp.router(
        title: 'Workflow',
        debugShowCheckedModeBanner: false,
        theme: _buildTheme(),
        routerConfig: _router,
      ),
    );
  }
}
