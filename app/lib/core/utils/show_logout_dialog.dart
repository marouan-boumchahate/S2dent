import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

void showLogoutDialog(BuildContext context, {required VoidCallback onConfirm}) {
  showDialog(
    barrierDismissible: false,
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.logout,
              color: context.colors.primary,
            ),
            const SizedBox(width: 8),
            Text("Logout"),
          ],
        ),
        content: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: context.colors.surfaceContainer,
          ),
          child: Text("Are you sure you want to logout?"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text("Cancel"),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              onConfirm();
            },
            child: Text("Logout"),
          ),
        ],
      );
    },
  );
}
