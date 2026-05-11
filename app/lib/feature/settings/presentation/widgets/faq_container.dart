import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class FaqContainer extends StatelessWidget {
  const FaqContainer({
    super.key,
    required this.question,
    required this.answer,
  });

  final String question;
  final String answer;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(12),
      margin: EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.blueGrey.withAlpha(160),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            question,
            style: context.texts.titleLarge!.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const Divider(thickness: 2),
          Text(
            answer,
            style: context.texts.bodyLarge!.copyWith(
              color: context.colors.onSurface.withAlpha(200),
            ),
          )
        ],
      ),
    );
  }
}
