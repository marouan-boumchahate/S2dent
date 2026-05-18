import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class CustomTextButton extends StatelessWidget {
  const CustomTextButton({
    super.key,
    required this.label,
    required this.color,
    required this.onTap,
    this.enable = true,
  });
  final String label;
  final Color color;
  final bool enable;
  final Function() onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enable ? onTap : null,
      child: Text(
        label,
        style: context.texts.labelLarge!.copyWith(
          color: color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
