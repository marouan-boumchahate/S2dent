import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/custom_appbar.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/home/presentation/widgets/pk_setup_dialog.dart';
import 'package:app/feature/qr/presentation/providers/qr_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

class QRGenerate extends ConsumerStatefulWidget {
  const QRGenerate({
    super.key,
    required this.credentialId,
    required this.title,
    required this.code,
    required this.type,
  });

  final String credentialId;
  final String title;
  final String code;
  final CredentialItemType type;

  @override
  ConsumerState<QRGenerate> createState() => _QRGenerateState();
}

class _QRGenerateState extends ConsumerState<QRGenerate> {
  @override
  Widget build(BuildContext context) {
    final qrController = ref.watch(qrControllerProvider(widget.credentialId));
    ref.listen(
      qrControllerProvider(widget.credentialId),
      (previous, next) {
        next.whenOrNull(
          error: (error, stackTrace) {
            if (error.toString() == "NO PK FOUND") {
              showDialog(
                context: context,
                builder: (context) => PkSetupDialog(
                  onSave: () => ref
                      .read(qrControllerProvider(widget.credentialId).notifier)
                      .generate(),
                ),
              );
            }
          },
        );
      },
    );
    return Scaffold(
      appBar: CustomAppbar(color: context.colors.surface),
      body: qrController.when(
        data: (token) => _body(context, token!),
        error: (error, _) {
          if (error.toString() == "NO PK FOUND") return const SizedBox.shrink();
          return Center(child: Text("ERROR OCCURED: $error"));
        },
        loading: () => LoadingState(
          animationPath: "assets/animations/qr_scanning.json",
        ),
      ),
    );
  }

  Widget _body(BuildContext context, String token) {
    return MainLayout(
      children: [
        const SizedBox(height: 60),
        _headerSection(context),
        const SizedBox(height: 32),
        Center(
          child: QrImageView(
            data: token,
            version: QrVersions.auto,
            size: 280,
            eyeStyle: QrEyeStyle(
              eyeShape: QrEyeShape.circle,
              color: context.colors.primary,
            ),
            dataModuleStyle: QrDataModuleStyle(
              dataModuleShape: QrDataModuleShape.square,
              color: context.colors.primary,
            ),
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: Text(
            "Show this to the verifier to verify your credential",
            textAlign: TextAlign.center,
            style:
                context.texts.bodyMedium!.copyWith(color: AppColors.textHint),
          ),
        ),
      ],
    );
  }

  Widget _headerSection(BuildContext context) {
    return Row(
      children: [
        CredentialIcon(type: widget.type),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                style: context.texts.titleLarge?.copyWith(
                  color: context.colors.primary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                widget.code,
                style: context.texts.bodyMedium?.copyWith(color: Colors.grey),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
