import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class IdentityButton extends StatelessWidget {
  const IdentityButton({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });
  final String title, subtitle;
  final IconData icon;
  final bool isSelected;
  final Function() onTap;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: Duration(milliseconds: 300),
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.colors.primaryContainer,
          border: Border.all(
              color: isSelected
                  ? context.colors.primary
                  : Colors.blueGrey.withAlpha(160),
              width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: ListTile(
          leading: Container(
            padding: EdgeInsets.all(8),
            decoration: BoxDecoration(
              border: Border.all(color: context.colors.inversePrimary),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: context.colors.primary,
            ),
          ),
          title: Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          subtitle: Text(subtitle),
        ),
      ),
    );
  }
}
