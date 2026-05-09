import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.metamask = false,
  });

  final String label;
  final Function()? onTap;
  final bool metamask;

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(12),
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 16),
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: context.colors.primary,
              width: 2,
            ),
          ),
          child: metamask
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SvgPicture.asset("assets/logos/metamask.svg", width: 25),
                    const SizedBox(width: 12),
                    _labelTextWidget(context),
                  ],
                )
              : _labelTextWidget(context),
        ),
      ),
    );
  }

  Text _labelTextWidget(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        color: context.colors.primary,
        fontSize: 20,
      ),
      textAlign: TextAlign.center,
    );
  }
}
