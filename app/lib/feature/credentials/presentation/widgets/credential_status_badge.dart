import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class CredentialStatusBadge extends StatelessWidget {
  const CredentialStatusBadge({
    super.key,
    required this.isRevoked,
  });

  final bool isRevoked;

  @override
  Widget build(BuildContext context) {
    final (label, bgColor, textColor) = _appearance();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor.withAlpha(40),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: bgColor.withAlpha(160)),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (String, Color, Color) _appearance() {
    if (isRevoked) {
      return ('Revoked', Colors.red, Colors.red.shade700);
    }
    return ('Valid', Colors.green, Colors.green.shade700);
  }
}
