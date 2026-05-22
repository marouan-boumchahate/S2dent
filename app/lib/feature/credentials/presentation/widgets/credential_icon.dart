import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:flutter/material.dart';

class CredentialIcon extends StatelessWidget {
  const CredentialIcon({super.key, required this.type});

  final CredentialItemType type;

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
      case CredentialItemType.degree:
        return (Icons.school_outlined, Colors.indigo);
      case CredentialItemType.certificate:
        return (Icons.workspace_premium_outlined, Colors.amber.shade700);
      case CredentialItemType.transcript:
        return (Icons.description_outlined, Colors.teal);
      case CredentialItemType.enrollment:
        return (Icons.how_to_reg_outlined, Colors.blue);
      case CredentialItemType.achievement:
        return (Icons.emoji_events_outlined, Colors.orange);
      case CredentialItemType.attendance:
        return (Icons.checklist_outlined, Colors.green);
      case CredentialItemType.unknown:
        return (Icons.help_outline, Colors.grey);
    }
  }
}
