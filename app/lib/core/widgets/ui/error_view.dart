import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/error_message.dart';
import 'package:flutter/material.dart';

class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.error,
    this.onTapRetry,
  });

  final Object error;
  final VoidCallback? onTapRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              errorMessage(error),
              textAlign: TextAlign.center,
              style: context.texts.bodyLarge,
            ),
            const SizedBox(height: 8),
            if (onTapRetry != null) ...[
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: context.colors.surfaceContainer,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: onTapRetry,
                  icon: Icon(
                    Icons.refresh,
                    color: context.colors.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
