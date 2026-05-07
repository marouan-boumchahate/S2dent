import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/feature/auth/presentation/widgets/auth_layout.dart';
import 'package:app/feature/auth/presentation/widgets/auth_textfield.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/auth/presentation/pages/verify_otp.dart';
import 'package:flutter/material.dart';

class VerifyEmailPage extends StatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  void onTapSendOTP() {
    // if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerifyOTPPage(),
      ),
    );
    _emailController.clear();
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Theme.of(context).brightness == Brightness.dark
        ? "assets/email_dark.png"
        : "assets/email_light.png";
    return AuthLayout(
      children: [
        _headerSection(context, image),
        PrimaryButton(
          onTap: () {
            onTapSendOTP();
          },
          label: "VERIFY",
        ),
      ],
    );
  }

  Form _headerSection(
    BuildContext context,
    String image,
  ) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Image.asset(image, width: 130),
          Padding(
            padding: const EdgeInsets.only(bottom: 32, top: 12),
            child: Text(
              "Verify your student identity",
              style: TextStyle(
                fontSize: context.texts.titleLarge!.fontSize,
              ),
            ),
          ),
          AuthTextfield(
            label: "STUDENT EMAIL",
            hint: "example@fbu.edu.tr",
            controller: _emailController,
          ),
        ],
      ),
    );
  }
}
