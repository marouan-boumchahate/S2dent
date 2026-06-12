import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/utils/show_verify_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/feature/auth/presentation/providers/appkit_provider.dart';
import 'package:app/feature/auth/presentation/providers/verification_provider.dart';
import 'package:app/feature/auth/presentation/widgets/auth_layout.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pinput/pinput.dart';

class VerifyOTPPage extends ConsumerStatefulWidget {
  const VerifyOTPPage({super.key});

  @override
  ConsumerState<VerifyOTPPage> createState() => _VerifyOTPPageState();
}

class _VerifyOTPPageState extends ConsumerState<VerifyOTPPage> {
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  void onTapVerify() {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_formKey.currentState!.validate()) return;
    ref
        .read(verificationControllerProvider.notifier)
        .submitIssuance(_otpController.text);
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final verificationState = ref.watch(verificationControllerProvider);
    final image = Theme.of(context).brightness == Brightness.dark
        ? "assets/images/otp_dark.png"
        : "assets/images/otp_light.png";

    ref.listen(verificationControllerProvider, (previous, next) {
      if (next.error != null && previous?.error != next.error) {
        showAlertDialog(context, next.error!, type: AlertType.error);
      }
      if (next.isComplete && !(previous?.isComplete ?? false)) {
        ref.read(appKitModalProvider.notifier).state = null;
        showCustomDialog(context);
      }
    });

    return AuthLayout(
      children: [
        _content(context, image),
        PrimaryButton(
          onTap: verificationState.isLoading ? null : onTapVerify,
          label: "VERIFY",
          isEnable: !verificationState.isLoading,
          isLoading: verificationState.isLoading,
        ),
      ],
    );
  }

  Form _content(BuildContext context, String image) {
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
      validator: (value) {
        if (value == null || value.isEmpty) {
          return "OTP required";
        }
        if (value.length < 6) {
          return "Must be 6 digits";
        }
        return null;
      },
      controller: _otpController,
      keyboardType: TextInputType.visiblePassword,
      textCapitalization: TextCapitalization.none,
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
