import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/role_selection/presentation/pages/role_selection.dart';
import 'package:flutter/material.dart';

void showCustomDialog(BuildContext context) {
  showDialog(
    barrierDismissible: false,
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.task_alt_rounded,
              color: context.colors.primary,
            ),
            const SizedBox(width: 8),
            Text("Request recieved"),
          ],
        ),
        content: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: context.colors.surfaceContainer,
            ),
            child: Text(
                "Verification process may take some time. You will be notified when its done.")),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                  builder: (context) => RoleSelectionPage(),
                ),
                (route) => false,
              );
            },
            child: Text("OK"),
          )
        ],
      );
    },
  );
}
