import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class InfoBadge extends StatelessWidget {
  const InfoBadge({
    super.key,
    required this.info,
    required this.color,
  });
  final String info;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 8),
      padding: EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      decoration: BoxDecoration(
        color: color.withAlpha(100),
        border: Border.all(color: color, width: 2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        info,
        style: context.texts.labelMedium!.copyWith(
          color: color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
