import 'package:app/components/decorations/custom_overscroll_glow.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/utils/dimensions.dart';
import 'package:flutter/material.dart';

class MainLayout extends StatelessWidget {
  const MainLayout({
    super.key,
    required this.children,
    this.topSafeArea = true,
    this.bottomSafeArea = true,
  });
  final List<Widget> children;
  final bool topSafeArea;
  final bool bottomSafeArea;
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: topSafeArea,
      bottom: bottomSafeArea,
      child: SizedBox(
        width: screenWidth(context),
        height: screenHeight(context),
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: widthConstraints(context),
            ),
            child: ScrollConfiguration(
              behavior: CustomOverscrollGlow(glowColor: context.colors.primary),
              child: ListView(
                children: children,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
