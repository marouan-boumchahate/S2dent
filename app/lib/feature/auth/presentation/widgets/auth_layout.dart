import 'package:app/core/widgets/buttons/custom_backbutton.dart';
import 'package:app/core/widgets/layouts/app_layout.dart';
import 'package:flutter/material.dart';

class AuthLayout extends StatelessWidget {
  const AuthLayout({
    super.key,
    required this.children,
  });
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    return AppLayout(
      child: Stack(
        children: [
          LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: children,
                ),
              ),
            ),
          ),
          Positioned(
            top: 20,
            left: 0,
            child: CustomBackButton(),
          ),
        ],
      ),
    );
  }
}
