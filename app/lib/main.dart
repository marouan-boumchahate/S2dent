import 'package:app/pages/home.dart';
import 'package:app/pages/login.dart';
import 'package:app/theme/flex_color_scheme.dart';
import 'package:device_preview/device_preview.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final secureStorage = FlutterSecureStorage();
  final publicKey = await secureStorage.read(key: "publicKey");
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(
    DevicePreview(
      enabled: true,
      builder: (context) => MyApp(
        isLoggedIn: publicKey != null,
      ),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    required this.isLoggedIn,
  });

  final bool isLoggedIn;
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      themeMode: ThemeMode.dark,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: isLoggedIn ? HomePage() : LoginPage(),
    );
  }
}
