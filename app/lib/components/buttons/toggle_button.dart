import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class ToggleButton extends StatelessWidget {
  const ToggleButton({
    super.key,
    required this.onTap,
    required this.isSelected,
    required this.child,
  });
  final Function() onTap;
  final bool isSelected;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: Duration(milliseconds: 300),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: isSelected
                ? context.colors.inversePrimary
                : context.colors.surfaceContainer,
            border: Border.all(
              color: isSelected ? context.colors.primary : Colors.transparent,
            ),
          ),
          padding: EdgeInsets.symmetric(vertical: 8, horizontal: 20),
          child: child,
        ),
      ),
    );
  }
}
