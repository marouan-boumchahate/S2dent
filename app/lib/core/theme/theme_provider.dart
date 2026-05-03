import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier() : super(ThemeMode.light) {
    _loadTheme();
  }

  void setTheme(ThemeMode theme) async {
    state = theme;
    final diskInstance = await SharedPreferences.getInstance();
    diskInstance.setString("themeMode", theme.name);
  }

  void _loadTheme() async {
    final diskInstance = await SharedPreferences.getInstance();
    final theme = diskInstance.getString("themeMode") ?? "light";
    if (theme == "light") {
      state = ThemeMode.light;
    } else if (theme == "dark") {
      state = ThemeMode.dark;
    } else {
      state = ThemeMode.system;
    }
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>(
  (ref) => ThemeNotifier(),
);
