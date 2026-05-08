import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_status_badge.dart';
import 'package:flutter/material.dart';

class CredentialCard extends StatelessWidget {
  const CredentialCard({
    super.key,
    required this.credential,
  });

  final Credential credential;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blueGrey.withAlpha(160)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {},
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CredentialIcon(type: credential.type),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      credential.title,
                      style: context.texts.titleLarge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      credential.issuerName,
                      style: context.texts.bodyLarge?.copyWith(
                        color: Colors.grey,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      dateFormatter(credential.issuedAt),
                      style: context.texts.bodySmall?.copyWith(
                        color: context.colors.onSurface.withAlpha(128),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              CredentialStatusBadge(status: credential.status),
            ],
          ),
        ),
      ),
    );
  }
}
