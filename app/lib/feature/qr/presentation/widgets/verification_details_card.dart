import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/feature/qr/presentation/widgets/verification_info_row.dart';
import 'package:flutter/material.dart';

class VerificationDetailsCard extends StatelessWidget {
  const VerificationDetailsCard({
    super.key,
    required this.payload,
  });

  final Map<String, dynamic> payload;

  //foramts the value if its date
  String _valueFormatter(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return dateFormatter(parsed);
    return value;
  }

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
            Text(
              'CREDENTIAL DETAILS',
              style: context.texts.labelLarge?.copyWith(
                color: context.colors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            const Divider(thickness: 2),
            const SizedBox(height: 8),
            ...payload.entries
                .where(
                  (element) => element.value is! int,
                )
                .map(
                  (e) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: VerificationInfoRow(
                      label: e.key.replaceAll('_', ' ').toUpperCase(),
                      //incase its a date, format it (otherwise return the same value)
                      value: _valueFormatter(e.value),
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
