import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/feature/auth/presentation/providers/verification_provider.dart';
import 'package:app/feature/auth/presentation/widgets/auth_layout.dart';
import 'package:app/feature/auth/presentation/widgets/auth_textfield.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/auth/presentation/pages/verify_otp.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class VerifyEmailPage extends ConsumerStatefulWidget {
  const VerifyEmailPage({super.key});

  @override
  ConsumerState<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends ConsumerState<VerifyEmailPage> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  void onTapSendOTP() {
    if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    ref.read(verificationControllerProvider.notifier).sendEmail(
          _emailController.text.trim(),
        );
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final verificationState = ref.watch(verificationControllerProvider);
    final image = Theme.of(context).brightness == Brightness.dark
        ? "assets/images/env_dark.png"
        : "assets/images/env_light.png";

    ref.listen(verificationControllerProvider, (previous, next) {
      if (next.error != null && previous?.error != next.error) {
        showAlertDialog(context, next.error!, type: AlertType.error);
      }
      if (next.emailSent && !(previous?.emailSent ?? false)) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const VerifyOTPPage()),
        );
      }
    });

    return AuthLayout(
      children: [
        _headerSection(context, image),
        PrimaryButton(
          onTap: verificationState.isLoading ? null : onTapSendOTP,
          label: "VERIFY",
          isEnable: !verificationState.isLoading,
          isLoading: verificationState.isLoading,
        ),
      ],
    );
  }

  Form _headerSection(BuildContext context, String image) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Image.asset(image, width: 110),
          Padding(
            padding: const EdgeInsets.only(bottom: 32, top: 12),
            child: Text(
              "Verify your student identity",
              style: context.texts.titleLarge,
            ),
          ),
          AuthTextfield(
            label: "EMAIL",
            hint: "example@gmail.com",
            controller: _emailController,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return "Email is required";
              }
              final parts = value.trim().split('@');
              if (parts.length != 2 || parts[1].isEmpty) {
                return "Must be a valid email address";
              }
              return null;
            },
          ),
        ],
      ),
    );
  }
}
