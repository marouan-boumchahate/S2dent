import 'package:app/components/app_layout.dart';
import 'package:flutter/material.dart';

class VerifyCodePage extends StatefulWidget {
  const VerifyCodePage({super.key});

  @override
  State<VerifyCodePage> createState() => _VerifyCodePageState();
}

class _VerifyCodePageState extends State<VerifyCodePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppLayout(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              BackButton(),
              Text("Verify the OTP Code"),
            ],
          ),
        ),
      ),
    );
  }
}
