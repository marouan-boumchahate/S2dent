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
    switch (notification.type) {
      case AppNotificationType.issuance:
        return Icons.verified_rounded;
      case AppNotificationType.revocation:
        return Icons.cancel_rounded;
      case AppNotificationType.unknown:
        return Icons.notifications_outlined;
    }
  }

  Color _iconColor(ColorScheme colors) {
    switch (notification.type) {
      case AppNotificationType.issuance:
        return colors.primary;
      case AppNotificationType.revocation:
        return colors.error;
      case AppNotificationType.unknown:
        return AppColors.textMuted;
    }
  }

  String get _timeAgo {
    final at = notification.createdAt;
    if (at == null) return "";
    final diff = DateTime.now().difference(at);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${at.day}/${at.month}/${at.year}';
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
                    maxLines: 5,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
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
