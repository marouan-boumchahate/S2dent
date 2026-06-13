import 'package:app/core/navigation/navigator_key_provider.dart';
import 'package:app/core/navigation/shell_page.dart';
import 'package:app/core/theme/flex_color_scheme.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/auth/presentation/providers/auth_provider.dart';
import 'package:app/feature/role_selection/presentation/pages/role_selection.dart';
import 'package:device_preview/device_preview.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final prefs = await SharedPreferences.getInstance();
  final savedTheme = prefs.getString("themeMode") ?? "light";
  final initialTheme = ThemeNotifier.fromString(savedTheme);
  runApp(
    DevicePreview(
      enabled: false,
      builder: (context) => ProviderScope(
        retry: (retryCount, error) {
          //permanent client errors (4xx) are not fixable by retrying, stop and never retry
          if (error is DioException) {
            final status = error.response?.statusCode;
            if (status != null && status >= 400 && status < 500) {
              return null;
            }
          }
          //transient/flaky errors (5xx, timeout, network) get a short exponential backoff and try 3 times only (total 4 api calls)
          if (retryCount >= 3) return null;
          return Duration(milliseconds: 200 * (1 << retryCount));
        },
        overrides: [
          themeProvider.overrideWith((ref) => ThemeNotifier(initialTheme)),
        ],
        child: const MyApp(),
      ),
    ),
  );
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(const AssetImage('assets/logos/s2dent_dark.png'), context);
    precacheImage(const AssetImage('assets/logos/s2dent_light.png'), context);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ref.watch(themeProvider);
    final session = ref.watch(hasSessionProvider);
    final navigatorKey = ref.watch(navigatorKeyProvider);

    return MaterialApp(
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      themeMode: theme,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: session.when(
        data: (hasSession) =>
            hasSession ? const ShellPage() : const RoleSelectionPage(),
        loading: () => const Scaffold(body: LoadingState()),
        error: (error, stackTrace) => const Scaffold(
          body: Center(
            child: Text("Something went wrong. Please restart the app."),
          ),
        ),
      ),
    );
  }
}
