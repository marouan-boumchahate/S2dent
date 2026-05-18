import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class StatItem extends StatelessWidget {
  const StatItem({
    super.key,
    required this.stat,
    required this.label,
    required this.color,
  });
  final String stat;
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          stat,
          style: context.texts.titleLarge!.copyWith(color: color),
        ),
        Text(
          label,
          style: context.texts.bodySmall,
        ),
      ],
    );
  }
}
