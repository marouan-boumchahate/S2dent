import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/qr/domain/models/verification_result.dart';
import 'package:app/feature/qr/presentation/widgets/verification_info_row.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';

class VerificationCredentialCard extends StatelessWidget {
  const VerificationCredentialCard({
    super.key,
    required this.data,
  });

  final VerificationResult data;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          border: Border.all(color: Colors.blueGrey.withAlpha(160)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                CredentialIcon(type: data.verificationMeta.type),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data.verificationMeta.title,
                        style: context.texts.titleMedium?.copyWith(
                          color: data.verificationMeta.isRevoked
                              ? AppColors.error
                              : context.colors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        data.verificationMeta.type.name.capitalize,
                        style: context.texts.bodySmall
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                      Text(
                        data.verificationMeta.code,
                        style: context.texts.bodySmall
                            ?.copyWith(color: AppColors.textHint),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(thickness: 2),
            const SizedBox(height: 8),
            VerificationInfoRow(
              label: 'ISSUED',
              value: dateFormatter(data.verificationMeta.issuedAt),
            ),
            const SizedBox(height: 8),
            VerificationInfoRow(
              label: 'DESCRIPTION',
              value: data.verificationMeta.description,
            ),
            if (data.verificationMeta.isRevoked) ...[
              const SizedBox(height: 8),
              VerificationInfoRow(
                label: 'REVOKE TX',
                value: data.verificationBlockchain.revokeTxHash != null
                    ? data.verificationBlockchain.revokeTxHash!
                    : '—',
                color: AppColors.error,
              ),
              const SizedBox(height: 8),
              VerificationInfoRow(
                label: 'REASON',
                value: data.verificationBlockchain.revocationReason ?? '—',
                color: AppColors.error,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
