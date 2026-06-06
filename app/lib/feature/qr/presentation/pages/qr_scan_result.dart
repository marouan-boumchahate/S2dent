import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/custom_appbar.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/qr/domain/models/verification_result.dart';
import 'package:app/feature/qr/presentation/providers/qr_provider.dart';
import 'package:app/feature/qr/presentation/widgets/verification_credential_card.dart';
import 'package:app/feature/qr/presentation/widgets/verification_details_card.dart';
import 'package:app/feature/qr/presentation/widgets/verification_student_card.dart';
import 'package:app/feature/qr/presentation/widgets/verification_validity_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class QRScanResultPage extends ConsumerWidget {
  const QRScanResultPage({
    super.key,
    required this.result,
  });

  final String result;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final verificationResult = ref.watch(qrVerificationResultProvider(result));
    return Scaffold(
      appBar: CustomAppbar(color: context.colors.surface),
      body: verificationResult.when(
        data: (data) => _body(context, data),
        error: (error, stackTrace) => Center(
          child: Text("ERROR OCCURED: $error"),
        ),
        loading: () => Center(
          child: LoadingState(
            animationPath: "assets/animations/qr_scanning.json",
          ),
        ),
      ),
    );
  }

  Widget _body(BuildContext context, VerificationResult data) {
    return MainLayout(
      children: [
        VerificationValidityCard(isRevoked: data.verificationMeta.isRevoked),
        VerificationCredentialCard(data: data),
        VerificationStudentCard(data: data),
        if (data.payload.isNotEmpty)
          VerificationDetailsCard(payload: data.payload),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            "Verified & Trusted by S2dent Protocol",
            style:
                context.texts.labelLarge?.copyWith(color: AppColors.textHint),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}
