import 'package:app/core/services/pk_storage.service.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/custom_backbutton.dart';
import 'package:app/core/widgets/ui/buttons/pressable_info_tile.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:app/core/widgets/ui/info_tile.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:app/feature/home/presentation/widgets/pk_setup_dialog.dart';
import 'package:app/feature/settings/presentation/pages/faqs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  void onTapHelp() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FaqsPage(),
      ),
    );
  }

  void onTapSavePK() async {
    final pk = await ref.read(pkStorageServiceProvider).getPK();
    if (!mounted) return;
    if (pk == null) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => PkSetupDialog(
          onSave: () => showAlertDialog(
            context,
            "Private Key Saved Successfully",
            type: AlertType.success,
          ),
        ),
      );
    } else {
      showAlertDialog(context, "You already have a saved PK");
    }
  }

  Future<void> onTapContactUs() async {
    final uri = Uri(
      scheme: "mailto",
      path: "test@fbu.tr",
      queryParameters: {
        "subject": "Support Request",
        "body": "",
      },
    );
    await launchUrl(uri);
  }

  void onToggleTheme(bool isDarkMode) {
    ref
        .read(themeProvider.notifier)
        .setTheme(isDarkMode ? ThemeMode.dark : ThemeMode.light);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ref.watch(themeProvider);
    return Scaffold(
      backgroundColor: context.colors.surface,
      appBar: AppBar(
        flexibleSpace: Container(color: context.colors.surface),
        title: Text(
          "Settings",
          style: context.texts.titleLarge!.copyWith(
            color: context.colors.onPrimaryContainer,
          ),
        ),
        backgroundColor: context.colors.onPrimary,
        leading: CustomBackButton(),
        leadingWidth: 80,
      ),
      body: MainLayout(
        children: [
          _appPreference(theme),
          _support(),
          _security(),
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

  Padding _security() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: InfoSection(
        title: "Security",
        widgets: [
          PressableInfoTile(
            label: "Save a Private Key",
            onTap: onTapSavePK,
            icon: Icons.save,
          ),
        ],
      ),
    );
  }
}
