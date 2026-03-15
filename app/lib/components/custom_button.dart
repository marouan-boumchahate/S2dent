import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  const CustomButton({
    super.key,
    required this.onTap,
    required this.label,
  });
  final Function() onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Material(
        color: context.colors.primary,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          splashColor: Colors.white.withAlpha(100),
          borderRadius: BorderRadius.circular(16),
          onTap: () {},
          child: Container(
            padding: EdgeInsets.symmetric(vertical: 14),
            width: double.infinity,
            child: Text(
              label,
              style: TextStyle(
                color: context.colors.onPrimary,
                fontSize: 20,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
