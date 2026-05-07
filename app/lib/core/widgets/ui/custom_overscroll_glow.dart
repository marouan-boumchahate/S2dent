import 'package:flutter/material.dart';

class CustomOverscrollGlow extends ScrollBehavior {
  const CustomOverscrollGlow({
    required this.glowColor,
  });

  final Color glowColor;

  @override
  Widget buildOverscrollIndicator(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    return GlowingOverscrollIndicator(
      axisDirection: details.direction,
      color: glowColor,
      child: child,
    );
  }
}
