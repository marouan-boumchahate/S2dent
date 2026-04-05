import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class InfoTile extends StatelessWidget {
  const InfoTile({
    super.key,
    required this.label,
    required this.trailing,
    required this.icon,
  });
  final String label;
  final Widget trailing;
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                icon,
                color: context.colors.primary,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
          trailing
        ],
      ),
    );
  }
}
