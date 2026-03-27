import 'package:app/components/app_layout.dart';
import 'package:app/components/buttons/custom_backbutton.dart';
import 'package:app/components/buttons/primary_button.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/pages/role_selection.dart';
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

  void _showDialog() {
    showDialog(
      barrierDismissible: false,
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(
                Icons.task_alt_rounded,
                color: context.colors.primary,
              ),
              const SizedBox(width: 8),
              Text("Request recieved"),
            ],
          ),
          content: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: context.colors.surfaceContainer,
              ),
              child: Text(
                  "Verification process may take some time. You will be notified when its done.")),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(
                    builder: (context) => RoleSelectionPage(),
                  ),
                  (route) => false,
                );
              },
              child: Text("OK"),
            )
          ],
        );
      },
    );
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
                        onTap: () {
                          _showDialog();
                        },
                        label: "VERIFY",
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          CustomBackButton(),
        ],
      ),
    );
  }

  Column _content(BuildContext context, image) {
    return Column(
      children: [
        Image.asset(image, width: 120),
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
