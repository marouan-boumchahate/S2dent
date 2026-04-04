import 'package:app/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class ProfileSection extends StatelessWidget {
  const ProfileSection({
    super.key,
    required this.title,
    required this.widgets,
    this.editButton,
  });
  final String title;
  final Widget? editButton;
  final List<Widget> widgets;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.blueGrey.withAlpha(160),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 18,
                  color: context.colors.onSurface.withAlpha(180),
                  fontWeight: FontWeight.bold,
                ),
              ),
              editButton ?? SizedBox(),
            ],
          ),
          Divider(
            color: Colors.blueGrey.withAlpha(160),
          ),
          ...widgets,
        ],
      ),
    );
  }
}
