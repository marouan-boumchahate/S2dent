import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class CustomBackButton extends StatelessWidget {
  const CustomBackButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 20,
      left: 0,
      child: Container(
        width: 55,
        height: 55,
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.blueGrey.withAlpha(160),
            width: 2,
          ),
        ),
        child: BackButton(
          onPressed: () => Navigator.pop(context),
          color: context.colors.primary,
        ),
      ),
    );
  }
}
