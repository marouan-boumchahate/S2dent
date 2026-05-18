import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.onTap,
    required this.label,
    this.isEnable = true,
  });
  final Function()? onTap;
  final String label;
  final bool isEnable;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isEnable ? context.colors.primary : Colors.grey,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        splashColor: Colors.white.withAlpha(100),
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: EdgeInsets.symmetric(vertical: 16),
          width: double.infinity,
          child: Text(
            label,
            style: context.texts.titleLarge!.copyWith(
              color: context.colors.onPrimary,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
