import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/feature/auth/presentation/widgets/auth_layout.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/show_verify_alert_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pinput/pinput.dart';

class VerifyOTPPage extends StatefulWidget {
  const VerifyOTPPage({super.key});

  @override
  State<VerifyOTPPage> createState() => _VerifyOTPPageState();
}

class _VerifyOTPPageState extends State<VerifyOTPPage> {
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Theme.of(context).brightness == Brightness.dark
        ? "assets/images/otp_dark.png"
        : "assets/images/otp_light.png";
    return AuthLayout(
      children: [
        _content(context, image),
        PrimaryButton(
          onTap: () {
            showCustomDialog(context);
          },
          label: "VERIFY",
        ),
      ],
    );
  }

  Form _content(BuildContext context, image) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Image.asset(image, width: 120),
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 32),
            child: Text(
              "A code have been sent to your email",
              style: context.texts.titleLarge!.copyWith(
                overflow: TextOverflow.clip,
              ),
            ),
          ),
          _otpFields(context),
        ],
      ),
    );
  }

  Pinput _otpFields(BuildContext context) {
    return Pinput(
      length: 6,
      controller: _otpController,
      keyboardType: TextInputType.visiblePassword,
      textCapitalization: TextCapitalization.characters,
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
      ],
      defaultPinTheme: PinTheme(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.blueGrey.withAlpha(160),
            width: 2,
          ),
        ),
        textStyle: context.texts.bodyLarge!,
      ),
      focusedPinTheme: PinTheme(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: context.colors.primary.withAlpha(160),
            width: 2,
          ),
        ),
        textStyle: context.texts.bodyLarge!.copyWith(
          color: context.colors.primary.withAlpha(160),
        ),
      ),
    );
  }
}
