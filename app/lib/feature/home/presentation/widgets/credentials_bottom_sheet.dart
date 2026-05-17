import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/core/widgets/ui/custom_overscroll_glow.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_card.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_details.dart';
import 'package:flutter/material.dart';

class CredentialsBottomSheet extends StatelessWidget {
  const CredentialsBottomSheet({
    super.key,
    required this.credentials,
  });

  final List<Credential> credentials;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: screenHeight(context) * 0.75,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "All Credentials",
                    style: TextStyle(fontSize: 20),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: Text(
                      "${credentials.length}",
                      style: TextStyle(
                        fontSize: 16,
                        color: context.colors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ScrollConfiguration(
                behavior:
                    CustomOverscrollGlow(glowColor: context.colors.primary),
                child: credentials.isEmpty
                    ? const Center(child: Text("No credentials yet"))
                    : ListView.builder(
                        itemCount: credentials.length,
                        itemBuilder: (ctx, index) => CredentialCard(
                          credential: credentials[index],
                          onTap: () => showDialog(
                            context: ctx,
                            builder: (ctx2) => CredentialDetailsDialog(
                                credential: credentials[index]),
                          ),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
