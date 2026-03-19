import 'package:app/components/app_layout.dart';
import 'package:app/components/auth_textfield.dart';
import 'package:app/components/primary_button.dart';
import 'package:app/components/secondary_button.dart';

import 'package:app/components/toggle_button.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

enum LoginMethod { privateKey, mnemonic }

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _privateController = TextEditingController();
  final _mnemonicController = TextEditingController();
  bool isDark = true;
  LoginMethod method = LoginMethod.privateKey;

  @override
  void dispose() {
    _privateController.dispose();
    _mnemonicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final icon = Theme.brightnessOf(context) == Brightness.dark
        ? "assets/password.png"
        : "assets/password_light.png";
    return AppLayout(
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _headerSection(context, icon),
              _toggleButtons(),
              _textField(),
              PrimaryButton(onTap: () {}, label: "Authenticate"),
              _dividerSection(context),
              SecondaryButton(onTap: () {}, label: "Generate New Wallet"),
              const SizedBox(height: 12),
              SecondaryButton(onTap: () {}, label: "MetaMask", metamask: true),
            ],
          ),
        ),
      ),
    );
  }

  Padding _dividerSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsGeometry.symmetric(vertical: 8),
      child: Column(
        children: [
          Divider(
            color: context.colors.onSurfaceVariant.withAlpha(120),
            thickness: 1,
            endIndent: 12,
          ),
          Text(
            "OR",
            style: TextStyle(
              color: context.colors.onSurface.withAlpha(150),
            ),
          )
        ],
      ),
    );
  }

  AnimatedSwitcher _textField() {
    return AnimatedSwitcher(
      duration: Duration(milliseconds: 300),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: child,
      ),
      child: AuthTextfield(
        key: ValueKey(method),
        controller: method == LoginMethod.privateKey
            ? _privateController
            : _mnemonicController,
        label: method == LoginMethod.privateKey ? "Private Key" : "Mnemonic",
        hint:
            method == LoginMethod.privateKey ? "ab3cd35..." : "Horse, Apple...",
      ),
    );
  }

  Row _toggleButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: ToggleButton(
            onTap: () {
              setState(() {
                method = LoginMethod.privateKey;
              });
            },
            label: "Private Key",
            isSelected: method == LoginMethod.privateKey,
          ),
        ),
        Expanded(
          child: ToggleButton(
            onTap: () {
              setState(() {
                method = LoginMethod.mnemonic;
              });
            },
            label: "Mnemonic",
            isSelected: method == LoginMethod.mnemonic,
          ),
        ),
      ],
    );
  }

  Container _headerSection(BuildContext context, String icon) {
    return Container(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        children: [
          Image.asset(
            icon,
            width: 150,
          ),
          Text(
            "Welcome Back",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 32,
                color: context.colors.onSurface),
          ),
          Text(
            "Choose your Sign-In method.",
            style: TextStyle(
              height: 2,
              color: context.colors.onSurface.withAlpha(200),
            ),
          ),
        ],
      ),
    );
  }
}
