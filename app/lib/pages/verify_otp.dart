import 'package:app/components/app_layout.dart';
import 'package:app/components/buttons/primary_button.dart';
import 'package:app/extensions/context_extensions.dart';
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

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Theme.of(context).brightness == Brightness.dark
        ? "assets/otp_dark.png"
        : "assets/otp_light.png";
    return AppLayout(
      child: Stack(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _content(context, image),
                      PrimaryButton(
                        onTap: () {},
                        label: "SUBMIT",
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          //Back Button
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

  Column _content(BuildContext context, image) {
    return Column(
      children: [
        Image.asset(image, width: 150),
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 32),
          child: Text(
            "A code have been sent to your email",
            style: TextStyle(
              fontSize: context.texts.titleLarge?.fontSize,
              overflow: TextOverflow.clip,
            ),
          ),
        ),
        Pinput(
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
            textStyle: TextStyle(fontSize: 16),
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
            textStyle: TextStyle(
              fontSize: 16,
              color: context.colors.primary.withAlpha(160),
            ),
          ),
        ),
      ],
    );
  }
}
