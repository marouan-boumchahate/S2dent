import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class ActivityItem extends StatelessWidget {
  const ActivityItem({
    super.key,
    required this.title,
    required this.subTitle,
    required this.icon,
    required this.isCredential,
  });

  final String title;
  final String subTitle;
  final IconData icon;
  final bool isCredential;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: Container(
            padding: EdgeInsets.all(18),
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: isCredential
                    ? context.colors.tertiary.withAlpha(50)
                    : context.colors.secondary.withAlpha(50),
                border: Border.all(
                  color: isCredential
                      ? context.colors.tertiary
                      : context.colors.secondary,
                )),
            child: Icon(
              icon,
              color: isCredential
                  ? context.colors.tertiary
                  : context.colors.secondary,
            ),
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: context.texts.titleLarge!.fontSize,
              ),
            ),
            Text(
              subTitle,
              style: TextStyle(
                fontSize: context.texts.bodyLarge!.fontSize,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
