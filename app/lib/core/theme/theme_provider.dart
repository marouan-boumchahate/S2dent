import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier([super.initial = ThemeMode.light]);

  void setTheme(ThemeMode theme) async {
    state = theme;
    final diskInstance = await SharedPreferences.getInstance();
    diskInstance.setString("themeMode", theme.name);
  }

  static ThemeMode fromString(String value) {
    if (value == "dark") return ThemeMode.dark;
    if (value == "system") return ThemeMode.system;
    return ThemeMode.light;
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>(
  (ref) => ThemeNotifier(),
);

final logoImageProvider = Provider<String>((ref) {
  final theme = ref.watch(themeProvider);
  return theme == ThemeMode.dark
      ? "assets/logos/s2dent_dark.png"
      : "assets/logos/s2dent_light.png";
});
