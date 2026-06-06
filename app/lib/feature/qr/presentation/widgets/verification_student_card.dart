import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/feature/qr/domain/models/verification_result.dart';
import 'package:app/feature/qr/presentation/widgets/verification_info_row.dart';
import 'package:flutter/material.dart';

class VerificationStudentCard extends StatelessWidget {
  const VerificationStudentCard({
    super.key,
    required this.data,
  });

  final VerificationResult data;

  @override
  Widget build(BuildContext context) {
    final address = data.verificationStudent.studentAddress;
    final truncatedAddress = address.length > 12
        ? '${address.substring(0, 6)}...${address.substring(address.length - 4)}'
        : address;
    final color = data.verificationMeta.isRevoked
        ? AppColors.error
        : context.colors.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8.0, top: 8),
          child: Text("STUDENT"),
        ),
        Padding(
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
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color.withAlpha(60),
                      ),
                      child:
                          Icon(Icons.person_outline, color: color, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      data.verificationStudent.studentName,
                      style: context.texts.titleSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(thickness: 2),
                const SizedBox(height: 8),
                VerificationInfoRow(label: 'WALLET', value: truncatedAddress),
                const SizedBox(height: 8),
                VerificationInfoRow(
                  label: 'TX HASH',
                  value:
                      '${data.verificationBlockchain.issueTxHash.substring(0, 10)}...',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
