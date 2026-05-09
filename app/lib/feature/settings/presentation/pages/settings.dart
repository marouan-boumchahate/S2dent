import 'package:app/core/widgets/ui/buttons/custom_backbutton.dart';
import 'package:app/core/widgets/ui/buttons/pressable_info_tile.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:app/core/widgets/ui/info_tile.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  void onTapHelp() {}

  void onTapContactUs() {}

  void onToggleTheme(bool isDarkMode) {
    ref
        .read(themeProvider.notifier)
        .setTheme(isDarkMode ? ThemeMode.dark : ThemeMode.light);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ref.watch(themeProvider);
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      appBar: AppBar(
        title: Text(
          "Settings",
          style: TextStyle(color: context.colors.onPrimaryContainer),
        ),
        backgroundColor: context.colors.onPrimary,
        leading: CustomBackButton(),
        leadingWidth: 80,
      ),
      body: MainLayout(
        children: [
          _appPreference(theme),
          _support(),
        ],
      ),
    );
  }

  Padding _support() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: InfoSection(
        title: "Support",
        widgets: [
          PressableInfoTile(
            label: "Help & FAQs",
            onTap: onTapHelp,
            icon: Icons.help_center_outlined,
          ),
          PressableInfoTile(
            label: "Contact Us",
            onTap: onTapContactUs,
            icon: Icons.support_agent,
          )
        ],
      ),
    );
  }

  Padding _appPreference(ThemeMode theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: InfoSection(
        title: "App Prefrence",
        widgets: [
          InfoTile(
            label: "Dark Mode",
            trailing: Switch(
              value: theme == ThemeMode.dark,
              onChanged: (isDarkMode) {
                onToggleTheme(isDarkMode);
              },
            ),
            icon: Icons.dark_mode_outlined,
          ),
        ],
      ),
    );
  }
}
