import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class ProfileTile extends StatelessWidget {
  const ProfileTile({
    super.key,
    required this.title,
    required this.trailing,
    required this.icon,
  });
  final String title;
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
                title,
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
