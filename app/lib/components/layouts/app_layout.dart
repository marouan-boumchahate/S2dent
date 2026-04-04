import 'package:app/extensions/context_extensions.dart';
import 'package:app/utils/dimensions.dart';
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
