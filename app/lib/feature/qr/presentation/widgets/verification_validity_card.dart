import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:flutter/material.dart';

class VerificationValidityCard extends StatelessWidget {
  const VerificationValidityCard({
    super.key,
    required this.isRevoked,
  });

  final bool isRevoked;

  @override
  Widget build(BuildContext context) {
    final color = isRevoked ? AppColors.error : const Color(0xFF50A77D);
    final label = isRevoked ? 'CREDENTIAL REVOKED' : 'CREDENTIAL VALID';
    final subtitle = isRevoked
        ? 'This credential has been revoked'
        : 'Verified on-chain. Not revoked';
    final shieldIcon = isRevoked ? Icons.error_outline : Icons.shield_outlined;
    final statusIcon = isRevoked ? Icons.close_rounded : Icons.check_rounded;

    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 8, left: 8, right: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withAlpha(30),
          border: Border.all(color: color.withAlpha(180)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withAlpha(50),
              ),
              child: Icon(shieldIcon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: context.texts.labelLarge?.copyWith(
                      color: color,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: context.texts.bodySmall?.copyWith(
                      color: color.withAlpha(180),
                    ),
                  ),
                ],
              ),
            ),
            Icon(statusIcon, color: color, size: 20),
          ],
        ),
      ),
    );
  }
}
