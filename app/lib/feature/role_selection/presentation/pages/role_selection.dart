import 'package:app/core/widgets/layouts/app_layout.dart';
import 'package:app/feature/role_selection/presentation/widgets/document_container.dart';
import 'package:app/feature/role_selection/presentation/widgets/identity_button.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/auth/presentation/pages/login.dart';
import 'package:app/feature/qr/presentation/pages/scanner.dart';
import 'package:flutter/material.dart';

class RoleSelectionPage extends StatefulWidget {
  const RoleSelectionPage({super.key});

  @override
  State<RoleSelectionPage> createState() => _RoleSelectionPageState();
}

enum Identity {
  none,
  student,
  verifier,
}

class _RoleSelectionPageState extends State<RoleSelectionPage> {
  Identity identity = Identity.none;

  void onTapContinue() async {
    if (identity == Identity.student) {
      // push the student to the verification process
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => LoginPage(),
        ),
      );
    } else {
      // push the verifier to the scan screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ScannerPage(),
        ),
      );
    }
    await Future.delayed(
      Duration(milliseconds: 350),
      () => setState(() {
        identity = Identity.none;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _headerSection(context),
          _illustrationsSection(context),
          _identityButtons(),
          PrimaryButton(
            label: "CONTINUE",
            onTap: identity == Identity.none ? null : onTapContinue,
            isEnable: identity != Identity.none,
          )
        ],
      ),
    );
  }

  Column _identityButtons() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: IdentityButton(
            title: "I'm Student",
            subtitle: "Access your student wallet",
            icon: Icons.person,
            isSelected: identity == Identity.student,
            onTap: () {
              setState(() {
                identity = Identity.student;
              });
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: IdentityButton(
            title: "I'm Verfier",
            subtitle: "Scan and Verify student credentials",
            icon: Icons.qr_code_2,
            isSelected: identity == Identity.verifier,
            onTap: () {
              setState(() {
                identity = Identity.verifier;
              });
            },
          ),
        ),
      ],
    );
  }

  Padding _illustrationsSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _imageContainer("assets/images/student.png", context.colors.secondary),
          DocumentContainer(),
          _imageContainer("assets/images/scan.png", context.colors.tertiary)
        ],
      ),
    );
  }

  Column _headerSection(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.blur_circular_outlined,
                color: context.colors.primary,
                size: 32,
              ),
              const SizedBox(width: 12),
              Text(
                "S2dent",
                style: context.texts.headlineLarge!.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        Text(
          "Choose your identity",
          style: context.texts.bodyMedium!.copyWith(
            color: context.colors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Container _imageContainer(String image, Color color) {
    return Container(
      width: 65,
      height: 65,
      decoration: BoxDecoration(
        border: Border.all(
          color: color,
          width: 2,
        ),
        shape: BoxShape.circle,
        image: DecorationImage(
          image: AssetImage(image),
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
