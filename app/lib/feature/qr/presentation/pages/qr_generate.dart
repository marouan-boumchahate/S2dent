import 'dart:async';

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
    required this.expirationTimeInSeconds,
  });

  final String credentialId;
  final String title;
  final String code;
  final CredentialItemType type;
  final int expirationTimeInSeconds;

  @override
  ConsumerState<QRGenerate> createState() => _QRGenerateState();
}

class _QRGenerateState extends ConsumerState<QRGenerate> {
  Timer? _countdownTimer;
  int? _secondsLeft;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(qrControllerProvider(widget.credentialId).notifier)
          .generate(expirationTimeInSeconds: widget.expirationTimeInSeconds);
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    setState(() => _secondsLeft = widget.expirationTimeInSeconds);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_secondsLeft! <= 0) {
          timer.cancel();
        } else {
          _secondsLeft = _secondsLeft! - 1;
        }
      });
    });
  }

  String _formatTime(int seconds) {
    if (seconds <= 0) return "QR code expired";
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    if (h > 0) return "${h}h ${m}m remaining";
    if (m > 0) return "${m}m ${s}s remaining";
    return "${s}s remaining";
  }

  @override
  Widget build(BuildContext context) {
    final qrController = ref.watch(qrControllerProvider(widget.credentialId));
    ref.listen(
      qrControllerProvider(widget.credentialId),
      (previous, next) {
        next.whenOrNull(
          data: (data) => _startCountdown(),
          error: (error, stackTrace) async {
            if (error.toString() == "NO PK FOUND") {
              bool pkSaved = false;
              await showDialog(
                context: context,
                builder: (context) => PkSetupDialog(
                  onSave: () {
                    pkSaved = true;
                    ref
                        .read(
                            qrControllerProvider(widget.credentialId).notifier)
                        .generate(
                            expirationTimeInSeconds:
                                widget.expirationTimeInSeconds);
                  },
                ),
              );
              if (!pkSaved && context.mounted) Navigator.pop(context);
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
        const SizedBox(height: 60),
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
        const SizedBox(height: 40),
        if (_secondsLeft != null)
          Center(
            child: Text(
              _formatTime(_secondsLeft!),
              style: context.texts.bodyLarge?.copyWith(
                color: _secondsLeft! <= 60
                    ? AppColors.error
                    : context.colors.primary,
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
