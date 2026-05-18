import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class QuickAction extends StatelessWidget {
  const QuickAction({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    required this.color,
  });
  final String label;
  final IconData icon;
  final Color color;
  final Function() onTap;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(12),
      child: Material(
        color: color.withAlpha(50),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
            child: Column(
              children: [
                Icon(icon, color: color),
                Text(
                  label,
                  style: context.texts.labelLarge!.copyWith(color: color),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
