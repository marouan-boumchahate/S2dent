import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:flutter/material.dart';

class CustomBackButton extends StatelessWidget {
  const CustomBackButton({
    super.key,
    this.isDisabled = false,
  });
  final bool isDisabled;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 55,
      height: 55,
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.blueGrey.withAlpha(160),
          width: 2,
        ),
      ),
      child: IconButton(
        icon: Icon(Icons.arrow_back),
        onPressed: isDisabled ? null : () => Navigator.pop(context),
        color: isDisabled ? AppColors.textMuted : context.colors.primary,
      ),
    );
  }
}
