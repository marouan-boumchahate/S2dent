import 'package:app/core/extensions/context_extensions.dart';
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
      padding: EdgeInsets.only(top: 16, bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              label,
              style: context.texts.labelLarge!.copyWith(
                color: context.colors.onSurfaceVariant.withAlpha(200),
              ),
            ),
          ),
          TextFormField(
            controller: controller,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: context.texts.bodyLarge!.copyWith(
                color: context.colors.onSurfaceVariant.withAlpha(200),
              ),
              filled: true,
              fillColor: context.colors.surfaceContainer,
              contentPadding: const EdgeInsets.all(20),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: Colors.blueGrey,
                  width: 2,
                ),
              ),
            ),
            textInputAction: textInputAction,
          )
        ],
      ),
    );
  }
}
