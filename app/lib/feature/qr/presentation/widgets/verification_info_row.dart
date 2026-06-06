import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:flutter/material.dart';

class VerificationInfoRow extends StatelessWidget {
  const VerificationInfoRow({
    super.key,
    required this.label,
    required this.value,
    this.color,
  });

  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: context.texts.labelSmall?.copyWith(
              color: color ?? AppColors.textHint,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: context.texts.bodySmall?.copyWith(
              color: color ?? context.colors.primary,
            ),
          ),
        ),
      ],
    );
  }
}
