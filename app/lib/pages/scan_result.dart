import 'package:app/components/app_layout.dart';
import 'package:flutter/material.dart';

class ScanResultPage extends StatelessWidget {
  const ScanResultPage({
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
