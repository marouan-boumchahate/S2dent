import 'package:app/components/app_layout.dart';
import 'package:app/components/auth_textfield.dart';
import 'package:app/components/buttons/primary_button.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/pages/verify_code.dart';
import 'package:flutter/material.dart';

class VerifyEmailPage extends StatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _backButtonKey = GlobalKey();

  void onTapSendOTP() {
    // if (!_formKey.currentState!.validate()) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerifyCodePage(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      child: Stack(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _headerSection(context),
                        _footerSection(),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          Positioned(
            top: 0,
            left: 0,
            child: Container(
              width: 55,
              height: 55,
              key: _backButtonKey,
              decoration: BoxDecoration(
                color: context.colors.primaryContainer,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.blueGrey.withAlpha(160),
                  width: 2,
                ),
              ),
              child: BackButton(onPressed: () => Navigator.pop(context)),
            ),
          ),
        ],
      ),
    );
  }

  Column _footerSection() {
    return Column(
      children: [
        AuthTextfield(
          label: "STUDENT EMAIL",
          hint: "example@fbu.edu.tr",
          controller: _emailController,
        ),
        PrimaryButton(
          onTap: () {
            onTapSendOTP();
          },
          label: "SEND OTP CODE",
        ),
      ],
    );
  }

  Column _headerSection(BuildContext context) {
    return Column(
      children: [
        Image.asset("assets/email.png", width: 150),
        Text(
          "Verify your student identity",
          style: TextStyle(
            fontSize: context.texts.titleLarge!.fontSize,
          ),
        ),
      ],
    );
  }
}
