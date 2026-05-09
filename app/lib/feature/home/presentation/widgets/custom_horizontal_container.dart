import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class CustomHorizontalContainer extends StatelessWidget {
  const CustomHorizontalContainer({
    super.key,
    required this.children,
  });
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.blueGrey.withAlpha(160),
          width: 2,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: children,
      ),
    );
  }
}
