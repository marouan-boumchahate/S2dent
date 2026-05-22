import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_status_badge.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

class CredentialDetailsDialog extends ConsumerWidget {
  const CredentialDetailsDialog({
    super.key,
    required this.id,
    required this.isRevoked,
  });

  final String id;
  final bool isRevoked;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(credentialDetailProvider(id));

    return Dialog(
      child: Container(
        padding: const EdgeInsets.all(16),
        width: widthConstraints(context),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: detailAsync.when(
          data: (credential) => _content(context, credential),
          loading: () => const SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, stackTrace) => const Padding(
            padding: EdgeInsets.all(16),
            child: Text("Failed to load credential"),
          ),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, Credential credential) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          margin: EdgeInsets.only(bottom: 8),
          width: double.infinity,
          child: Row(
            children: [
              CredentialIcon(type: credential.type),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      credential.title,
                      style: context.texts.titleMedium!.copyWith(
                        color: context.colors.onSurface,
                      ),
                    ),
                    Text(
                      credential.type.name.capitalize,
                      style: context.texts.titleSmall!.copyWith(
                        color: context.colors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              CredentialStatusBadge(isRevoked: isRevoked),
            ],
          ),
        ),
        const Divider(
          thickness: 2,
        ),
        Text(
          "Issuance Details",
          style: context.texts.titleMedium!.copyWith(
            color: context.colors.tertiary,
          ),
        ),
        const SizedBox(height: 8),
        _credentialInfoTile(
          context,
          "assets/icons/issuer.svg",
          "Issuer",
          credential.issuerAddress,
        ),
        _credentialInfoTile(
          context,
          "assets/icons/person.svg",
          "Issued to",
          credential.studentAddress,
        ),
        _credentialInfoTile(
          context,
          "assets/icons/issued_at.svg",
          "Issued at",
          dateFormatter(credential.issuedAt),
        ),
        if (isRevoked)
          _credentialInfoTile(
            context,
            "assets/icons/expires_at.svg",
            "Revocation reason",
            credential.revocationReason ?? "",
          ),
        const Divider(
          thickness: 2,
        ),
        Text(
          "Description",
          style: context.texts.titleMedium!.copyWith(
            color: context.colors.tertiary,
          ),
        ),
        const SizedBox(height: 8),
        Text(credential.description ?? "No description provided"),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _credentialInfoTile(
    BuildContext context,
    String asset,
    String title,
    String trailing,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Row(
              children: [
                SvgPicture.asset(
                  asset,
                  colorFilter: ColorFilter.mode(
                    AppColors.textMuted,
                    BlendMode.srcIn,
                  ),
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    title,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              trailing,
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
