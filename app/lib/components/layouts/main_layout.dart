import 'package:app/utils/dimensions.dart';
import 'package:flutter/material.dart';

class MainLayout extends StatelessWidget {
  const MainLayout({
    super.key,
    required this.children,
  });
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    return SafeArea(
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
            child: ListView(
              children: children,
            ),
          ),
        ),
      ),
    );
  }
}
