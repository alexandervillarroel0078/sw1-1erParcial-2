import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('Muestra pantalla de login sin sesión', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final authService = AuthService(prefs);

    await tester.pumpWidget(WorkflowApp(authService: authService));
    await tester.pumpAndSettle();

    expect(find.text('Workflow'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
  });
}
