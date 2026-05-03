import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The [AppTheme] defines light and dark themes for the app.
///
/// Theme setup for FlexColorScheme package v8.
/// Use same major flex_color_scheme package version. If you use a
/// lower minor version, some properties may not be supported.
/// In that case, remove them after copying this theme to your
/// app or upgrade the package to version 8.4.0.
///
/// Use it in a [MaterialApp] like this:
///
/// MaterialApp(
///   theme: AppTheme.light,
///   darkTheme: AppTheme.dark,
/// );
abstract final class AppTheme {
  // The FlexColorScheme defined light mode ThemeData.
  static ThemeData light = FlexThemeData.light(
    // FontFamily
    fontFamily: GoogleFonts.spaceGrotesk().fontFamily,
    // User defined custom colors made with FlexSchemeColor() API.
    colors: const FlexSchemeColor(
      primary: Color(0xFF0D9E6A),
      primaryContainer: Color(0xFFC8F7E5),
      secondary: Color(0xFF6D28D9),
      secondaryContainer: Color(0xFFEDE9FE),
      tertiary: Color(0xFF0284C7),
      tertiaryContainer: Color(0xFFBFEBFF),
      appBarColor: Color(0xFFEDE9FE),
      error: Color(0xFFDC2626),
      errorContainer: Color(0xFFFEE2E2),
    ),
    // Component theme configurations for light mode.
    subThemesData: const FlexSubThemesData(
      interactionEffects: true,
      tintedDisabledControls: true,
      inputDecoratorIsFilled: true,
      inputDecoratorBorderType: FlexInputBorderType.outline,
      alignedDropdown: true,
      navigationRailUseIndicator: true,
    ),
    // Direct ThemeData properties.
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    cupertinoOverrideTheme: const CupertinoThemeData(applyThemeToAll: true),
    useMaterial3: false,
  );

  // The FlexColorScheme defined dark mode ThemeData.
  static ThemeData dark = FlexThemeData.dark(
    // FontFamily
    fontFamily: GoogleFonts.spaceGrotesk().fontFamily,
    // User defined custom colors made with FlexSchemeColor() API.
    colors: const FlexSchemeColor(
      primary: Color(0xFF7DF9C2),
      primaryContainer: Color(0xFF0B0F1A),
      primaryLightRef: Color(0xFF0D9E6A), // The color of light mode primary
      secondary: Color(0xFFA78BFA),
      secondaryContainer: Color(0xFF0F0D1A),
      secondaryLightRef: Color(0xFF6D28D9), // The color of light mode secondary
      tertiary: Color(0xFF00C2FF),
      tertiaryContainer: Color(0xFF0D1B2A),
      tertiaryLightRef: Color(0xFF0284C7), // The color of light mode tertiary
      appBarColor: Color(0xFFEDE9FE),
      error: Color(0xFFF87171),
      errorContainer: Color(0xFF2A0F0F),
    ),
    // Component theme configurations for dark mode.
    subThemesData: const FlexSubThemesData(
      interactionEffects: true,
      tintedDisabledControls: true,
      blendOnColors: true,
      inputDecoratorIsFilled: true,
      inputDecoratorBorderType: FlexInputBorderType.outline,
      alignedDropdown: true,
      navigationRailUseIndicator: true,
    ),
    // Direct ThemeData properties.
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    cupertinoOverrideTheme: const CupertinoThemeData(applyThemeToAll: true),
    useMaterial3: false,
  );
}
