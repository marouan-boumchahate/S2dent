import 'package:app/core/widgets/ui/buttons/pressable_info_tile.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:flutter/material.dart';

class SettingsSection extends StatelessWidget {
  const SettingsSection({
    super.key,
    required this.onTapSettings,
  });
  final void Function() onTapSettings;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Settings",
        widgets: [
          PressableInfoTile(
            label: "Account Settings",
            onTap: onTapSettings,
            icon: Icons.settings,
          ),
        ],
      ),
    );
  }
}
