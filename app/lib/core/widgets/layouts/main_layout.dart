import 'package:app/core/widgets/ui/custom_overscroll_glow.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:flutter/material.dart';

class MainLayout extends StatelessWidget {
  const MainLayout({
    super.key,
    required this.children,
    this.topSafeArea = true,
    this.bottomSafeArea = true,
    this.backgroundImage,
  });
  final List<Widget> children;
  final bool topSafeArea;
  final bool bottomSafeArea;
  final String? backgroundImage;
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: topSafeArea,
      bottom: bottomSafeArea,
      child: SizedBox(
        width: screenWidth(context),
        height: screenHeight(context),
        child: Stack(
          children: [
            if (backgroundImage != null)
              Positioned.fill(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  child: Opacity(
                    key: ValueKey(backgroundImage),
                    opacity: 0.1,
                    child: Image.asset(
                      backgroundImage!,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
            Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: widthConstraints(context),
                ),
                child: ScrollConfiguration(
                  behavior:
                      CustomOverscrollGlow(glowColor: context.colors.primary),
                  child: ListView(
                    children: children,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
