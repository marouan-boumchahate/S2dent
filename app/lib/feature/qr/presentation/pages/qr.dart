import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/qr/presentation/pages/qr_credential_picker.dart';
import 'package:app/feature/qr/presentation/widgets/qr_action.dart';
import 'package:flutter/material.dart';

class QRPage extends StatelessWidget {
  const QRPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      children: [
        _headerSection(context),
        _body(context),
      ],
    );
  }

  Padding _body(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Choose an action..",
            style: context.texts.bodyMedium!.copyWith(
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 16),
          QRAction(
            onTap: () {},
            label: "Scan",
            description: "Verify a credential by scanning the provided QR Code",
            icon: Icons.qr_code_scanner,
            color: context.colors.tertiary,
          ),
          const SizedBox(height: 16),
          QRAction(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => QRCredentialPicker(),
                ),
              );
            },
            label: "Generate",
            description:
                "Choose a credential to generate a QR Code for someone to Verify it",
            icon: Icons.qr_code_rounded,
            color: context.colors.primary,
          ),
        ],
      ),
    );
  }

  Padding _headerSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            "QR Code",
            style: context.texts.displaySmall
                ?.copyWith(fontSize: 28)
                .copyWith(color: context.colors.primary),
          ),
          Text(
            "Verify or Generate a QR code",
            style: context.texts.bodyMedium!.copyWith(
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(
            thickness: 2,
          ),
        ],
      ),
    );
  }
}
