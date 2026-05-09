import 'package:app/feature/role_selection/presentation/pages/role_selection.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:app/core/theme/flex_color_scheme.dart';
import 'package:device_preview/device_preview.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(
    DevicePreview(
      enabled: false,
      builder: (context) => ProviderScope(
        child: MyApp(),
      ),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = ref.watch(themeProvider);
    return MaterialApp(
      themeMode: theme,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: RoleSelectionPage(),
    );
  }
}
