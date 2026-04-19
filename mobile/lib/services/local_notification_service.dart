import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../models/notificacion.dart';

/// Inicialización y avisos locales (sistema) para notificaciones del portal.
class LocalNotificationService {
  LocalNotificationService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(
        android: android,
        iOS: ios,
      ),
    );
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
  }

  static Future<void> show(Notificacion n) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'workflow_notifs',
        'Notificaciones',
        channelDescription: 'Avisos del trámite',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
      ),
      iOS: DarwinNotificationDetails(),
    );
    await _plugin.show(
      n.id.hashCode & 0x7fffffff,
      n.titulo,
      n.mensaje,
      details,
    );
  }
}
