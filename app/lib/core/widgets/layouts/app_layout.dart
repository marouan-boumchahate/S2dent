import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:flutter/material.dart';

class AppLayout extends StatelessWidget {
  const AppLayout({
    super.key,
    required this.child,
  });
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      body: SafeArea(
        top: true,
        bottom: true,
        child: SizedBox(
          width: screenWidth(context),
          height: screenHeight(context),
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: widthConstraints(context),
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
