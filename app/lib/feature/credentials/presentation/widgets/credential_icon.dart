import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:flutter/material.dart';

class CredentialIcon extends StatelessWidget {
  const CredentialIcon({super.key, required this.type});

  final CredentialType type;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconAndColor(context);

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: color.withAlpha(50),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(120)),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }

  (IconData, Color) _iconAndColor(BuildContext context) {
    switch (type) {
      case CredentialType.degree:
        return (Icons.school_outlined, Colors.indigo);
      case CredentialType.certificate:
        return (Icons.workspace_premium_outlined, Colors.amber.shade700);
      case CredentialType.transcript:
        return (Icons.description_outlined, Colors.teal);
      case CredentialType.enrollment:
        return (Icons.how_to_reg_outlined, Colors.blue);
      case CredentialType.achievement:
        return (Icons.emoji_events_outlined, Colors.orange);
      case CredentialType.attendance:
        return (Icons.checklist_outlined, Colors.green);
      case CredentialType.unknown:
        return (Icons.help_outline, Colors.grey);
    }
  }
}
