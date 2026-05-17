import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

enum AlertType { error, info, success }

void showAlertDialog(
  BuildContext context,
  String message, {
  AlertType type = AlertType.info,
}) {
  if (!context.mounted) return;
  showDialog(
    barrierDismissible: true,
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Row(
          children: [
            Icon(
              _iconFor(type),
              color: _colorFor(context, type),
            ),
            const SizedBox(width: 8),
            Text(_titleFor(type)),
          ],
        ),
        content: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: context.colors.surfaceContainer,
          ),
          child: Text(message),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text("OK"),
          ),
        ],
      );
    },
  );
}

IconData _iconFor(AlertType type) => switch (type) {
      AlertType.error => Icons.error_outline_rounded,
      AlertType.info => Icons.info_outline_rounded,
      AlertType.success => Icons.task_alt_rounded,
    };

Color _colorFor(BuildContext context, AlertType type) => switch (type) {
      AlertType.error => context.colors.error,
      AlertType.info => context.colors.primary,
      AlertType.success => context.colors.primary,
    };

String _titleFor(AlertType type) => switch (type) {
      AlertType.error => "Error",
      AlertType.info => "Info",
      AlertType.success => "Success",
    };
