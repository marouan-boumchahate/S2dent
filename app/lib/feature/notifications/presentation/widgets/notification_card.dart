import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:flutter/material.dart';

class NotificationCard extends StatelessWidget {
  const NotificationCard({
    super.key,
    required this.notification,
  });

  final AppNotification notification;

  IconData get _icon {
    switch (notification.status) {
      case AppNotificationStatus.verified:
        return Icons.verified_rounded;
      case AppNotificationStatus.failed:
        return Icons.error_outlined;
      case AppNotificationStatus.unknown:
        return Icons.question_mark_rounded;
    }
  }

  Color _iconColor(ColorScheme colors) {
    switch (notification.status) {
      case AppNotificationStatus.verified:
        return colors.primary;
      case AppNotificationStatus.failed:
        return colors.error;
      case AppNotificationStatus.unknown:
        return AppColors.textMuted;
    }
  }

  String get _timeAgo {
    final diff = DateTime.now().difference(notification.createdAt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${notification.createdAt.day}/${notification.createdAt.month}/${notification.createdAt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final color = _iconColor(context.colors);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.border.withAlpha(160),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withAlpha(30),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.message,
                    style: context.texts.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.clip,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.txHash,
                    style: context.texts.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _timeAgo,
                    style: context.texts.bodySmall?.copyWith(
                      color: context.colors.onSurface.withAlpha(100),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
