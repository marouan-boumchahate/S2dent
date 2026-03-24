import 'package:app/components/app_layout.dart';
import 'package:app/components/auth_textfield.dart';
import 'package:app/components/buttons/primary_button.dart';
import 'package:app/components/buttons/secondary_button.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/pages/verify_otp.dart';
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
    return AppLayout(
      child: Stack(
        children: [
          //the whole layout
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
                        _headerSection(context, image),
                        _bottomSection(),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          //backbutton
          Positioned(
            top: 20,
            left: 0,
            child: Container(
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
              child: BackButton(
                onPressed: () => Navigator.pop(context),
                color: context.colors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Column _headerSection(
    BuildContext context,
    String image,
  ) {
    return Column(
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
    );
  }

  Column _bottomSection() {
    return Column(
      children: [
        PrimaryButton(
          onTap: () {
            onTapSendOTP();
          },
          label: "SUBMIT",
        ),
        _divider(),
        SecondaryButton(
          label: "SIGN IN WITH A WALLET",
          onTap: () {},
        ),
      ],
    );
  }

  Padding _divider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: Divider(
              color: Colors.blueGrey.withAlpha(160),
              thickness: 2,
              endIndent: 6,
              height: 2,
            ),
          ),
          Text("Already verified student ?"),
          Expanded(
            child: Divider(
              color: Colors.blueGrey.withAlpha(160),
              thickness: 2,
              indent: 6,
              height: 2,
            ),
          ),
        ],
      ),
    );
  }
}
