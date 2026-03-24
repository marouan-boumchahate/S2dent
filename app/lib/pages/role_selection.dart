import 'package:app/components/app_layout.dart';
import 'package:app/components/document_container.dart';
import 'package:app/components/buttons/identity_button.dart';
import 'package:app/components/buttons/primary_button.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/pages/verify_email.dart';
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

  void onTapContinue() {
    if (identity == Identity.student) {
      // push the student to the verification process
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => VerifyEmailPage(),
        ),
      );
    } else {
      // push the verifier to the scan screen
    }
    setState(() {
      identity = Identity.none;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppLayout(
        child: LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
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
        ),
      ),
    ));
  }

  Column _identityButtons() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: IdentityButton(
            title: "I'm Student",
            subtitle: "Access your blockchain identity",
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
          _imageContainer("assets/student.png", context.colors.secondary),
          DocumentContainer(),
          _imageContainer("assets/scan.png", context.colors.tertiary)
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
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const Text(
          "Blockchain-powered student identity",
          style: TextStyle(color: Colors.blueGrey),
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
