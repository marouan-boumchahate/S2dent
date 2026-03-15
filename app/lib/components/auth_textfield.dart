import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class AuthTextfield extends StatelessWidget {
  const AuthTextfield({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    this.textInputAction,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return Container(
        padding: EdgeInsets.symmetric(vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                label,
                style: TextStyle(
                  color: context.colors.onSurfaceVariant.withAlpha(200),
                ),
              ),
            ),
            TextFormField(
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(
                  color: context.colors.onSurfaceVariant.withAlpha(200),
                ),
                filled: true,
                fillColor: context.colors.primaryContainer,
                contentPadding: const EdgeInsets.all(20),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.blueGrey),
                ),
              ),
              textInputAction: textInputAction,
            )
          ],
        ));
  }
}
