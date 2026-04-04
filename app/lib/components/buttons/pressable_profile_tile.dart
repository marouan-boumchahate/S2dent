import 'package:app/components/profile/profile_tile.dart';
import 'package:flutter/material.dart';

class PressableProfileTile extends StatelessWidget {
  const PressableProfileTile({
    super.key,
    required this.label,
    required this.onTap,
    required this.icon,
  });

  final String label;
  final Function() onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ProfileTile(
        title: label,
        trailing: Icon(
          Icons.arrow_forward_ios_rounded,
          size: 16,
        ),
        icon: icon,
      ),
    );
  }
}
