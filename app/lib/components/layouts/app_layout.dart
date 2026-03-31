import 'package:app/extensions/context_extensions.dart';
import 'package:app/utils/dimensions.dart';
import 'package:flutter/material.dart';

class AppLayout extends StatelessWidget {
  const AppLayout({
    super.key,
    required this.child,
    this.appBar,
  });
  final Widget child;
  final AppBar? appBar;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      body: Container(
        color: context.colors.onPrimary,
        child: SafeArea(
          bottom: true,
          child: Container(
            color: context.colors.onPrimary,
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
      ),
    );
  }
}
