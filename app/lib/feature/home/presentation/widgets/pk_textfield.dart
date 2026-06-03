import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class PkTextfield extends StatelessWidget {
  const PkTextfield({
    super.key,
    required this.hint,
    required this.controller,
    this.textInputAction,
    this.validator,
    this.obsecure = false,
  });

  final String hint;
  final TextEditingController controller;
  final bool obsecure;
  final TextInputAction? textInputAction;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
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
      obscureText: obsecure,
      validator: validator,
    );
  }
}
