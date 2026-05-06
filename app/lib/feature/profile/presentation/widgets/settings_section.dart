import 'package:app/core/widgets/buttons/pressable_info_tile.dart';
import 'package:app/core/widgets/info_section.dart';
import 'package:flutter/material.dart';

class SettingsSection extends StatelessWidget {
  const SettingsSection({
    super.key,
    required this.onTapSettings,
    required this.onTapContactUs,
  });
  final void Function() onTapSettings;
  final void Function() onTapContactUs;
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
          PressableInfoTile(
            label: "Contact Us",
            onTap: onTapContactUs,
            icon: Icons.contact_support_outlined,
          )
        ],
      ),
    );
  }
}
