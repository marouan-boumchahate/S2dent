import 'package:app/components/app_layout.dart';
import 'package:flutter/material.dart';

class VerificationResultPage extends StatelessWidget {
  const VerificationResultPage({
    super.key,
    required this.result,
  });

  final String result;

  @override
  Widget build(BuildContext context) {
    return AppLayout(
        child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(result),
      ],
    ));
  }
}
