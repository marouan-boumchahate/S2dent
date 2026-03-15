import 'package:app/components/app_layout.dart';
import 'package:app/components/auth_textfield.dart';
import 'package:app/components/custom_button.dart';
import 'package:app/components/text_container.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool isDark = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
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
          mainAxisSize: MainAxisSize.min,
          children: [
            _headerSection(context, icon),
            _textFields(),
            _forgotPassword(),
            CustomButton(onTap: () {}, label: "Sign In"),
            _orDivider(context),
            TextContainer(),
          ],
        ),
      ),
    ));
  }

  Row _forgotPassword() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: () {},
          child: const Text(
            "Forgot Password",
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  SizedBox _textFields() {
    return SizedBox(
      child: Column(
        children: [
          AuthTextfield(
            controller: _emailController,
            label: "SCHOOL EMAIL",
            hint: "student@stu.tr",
            textInputAction: TextInputAction.next,
          ),
          AuthTextfield(
            controller: _passwordController,
            label: "PASSWORD",
            hint: "*   *   *   *   *",
          ),
        ],
      ),
    );
  }

  Row _orDivider(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Divider(
            color: context.colors.onSurfaceVariant.withAlpha(120),
            thickness: 1,
            endIndent: 12,
          ),
        ),
        Text(
          "or",
          style: TextStyle(
            color: context.colors.onSurfaceVariant.withAlpha(120),
          ),
        ),
        Expanded(
          child: Divider(
            color: context.colors.onSurfaceVariant.withAlpha(120),
            thickness: 1,
            indent: 12,
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
            "Sign in to your student identity.",
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
