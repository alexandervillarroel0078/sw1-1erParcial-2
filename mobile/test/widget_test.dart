import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/auth/services/auth_service.dart';
import 'package:mobile/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await dotenv.load(fileName: '.env');
  });

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
