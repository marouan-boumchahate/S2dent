import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:flutter/material.dart';

class NotificationButton extends StatelessWidget {
  const NotificationButton({
    super.key,
    required this.onTap,
    required this.hasUnread,
  });

  final void Function() onTap;
  final bool hasUnread;
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        IconButton(
          onPressed: onTap,
          icon: Icon(
            Icons.notifications_none,
            color: AppColors.textMuted,
            size: 36,
          ),
        ),
        hasUnread
            ? Positioned(
                top: 10,
                right: 8,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: context.colors.error,
                    shape: BoxShape.circle,
                  ),
                ),
              )
            : const SizedBox(),
      ],
    );
  }
}
