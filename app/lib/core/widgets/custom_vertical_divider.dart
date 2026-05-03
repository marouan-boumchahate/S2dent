import 'package:flutter/material.dart';

class CustomVerticalDivider extends StatelessWidget {
  const CustomVerticalDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 30,
      child: VerticalDivider(
        thickness: 1,
        color: Colors.blueGrey.withAlpha(160),
        radius: BorderRadius.circular(12),
      ),
    );
  }
}
