import 'package:app/core/widgets/buttons/primary_button.dart';
import 'package:app/core/widgets/buttons/secondary_button.dart';
import 'package:app/core/widgets/layouts/auth_layout.dart';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/auth/presentation/pages/verify_email.dart';
import 'package:app/feature/home/presentation/pages/home.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  bool isDark = true;

  void onTapVerify() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerifyEmailPage(),
      ),
    );
  }

  void onTapSignIn() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => HomePage(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final icon = Theme.brightnessOf(context) == Brightness.dark
        ? "assets/s2dent_dark.png"
        : "assets/s2dent_light.png";
    return AuthLayout(
      children: [
        _headerSection(context, icon),
        _actions(context),
      ],
    );
  }

  Column _actions(BuildContext context) {
    return Column(
      children: [
        PrimaryButton(
          onTap: onTapSignIn,
          label: "SIGN IN WITH A WALLET",
        ),
        _dividerSection(context),
        SecondaryButton(onTap: onTapVerify, label: "Verify Identity"),
      ],
    );
  }

  Padding _dividerSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsGeometry.symmetric(vertical: 12),
      child: Column(
        children: [
          Divider(
            color: context.colors.onSurfaceVariant.withAlpha(120),
            thickness: 1,
            endIndent: 12,
          ),
          Text(
            "New student ?",
            style: TextStyle(
              color: context.colors.onSurface.withAlpha(150),
            ),
          )
        ],
      ),
    );
  }

  Container _headerSection(BuildContext context, String icon) {
    return Container(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        children: [
          Image.asset(
            icon,
            width: 140,
          ),
          Text(
            "Welcome Back",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 32,
                color: context.colors.onSurface),
          ),
          Text(
            "Sign in to your student wallet",
            style: TextStyle(
              height: 2,
              color: context.colors.onSurface.withAlpha(200),
            ),
          ),
          _infoBox(context),
        ],
      ),
    );
  }

  Padding _infoBox(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.colors.primary),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: context.colors.primary),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(
                  "Unverified students cannot sign in until they verify their identity",
                  overflow: TextOverflow.clip,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
