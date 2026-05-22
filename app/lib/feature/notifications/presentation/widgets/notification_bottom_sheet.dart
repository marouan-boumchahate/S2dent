import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/core/widgets/ui/custom_overscroll_glow.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/presentation/providers/notification_provider.dart';
import 'package:app/feature/notifications/presentation/widgets/notification_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationsBottomSheet extends ConsumerWidget {
  const NotificationsBottomSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationControllerProvider);
    final notificationNotifier =
        ref.read(notificationControllerProvider.notifier);

    return notifications.when(
      data: (notifications) => _sheetContent(
        notifications,
        context,
        notificationNotifier,
      ),
      error: (error, stackTrace) => const SizedBox(),
      loading: () => const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }

  SizedBox _sheetContent(
    List<AppNotification> notifications,
    BuildContext context,
    NotificationController notificationNotifier,
  ) {
    return SizedBox(
      height: screenHeight(context) * 0.75,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Notifications",
                    style: context.texts.titleLarge,
                  ),
                  TextButton(
                    onPressed: notifications.isEmpty
                        ? null
                        : () {
                            notificationNotifier.markAllAsRead();
                          },
                    child: Text(
                      "Mark all as read",
                      style: context.texts.labelLarge?.copyWith(
                        color: notifications.isEmpty
                            ? AppColors.textMuted
                            : context.colors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ScrollConfiguration(
                behavior: CustomOverscrollGlow(
                  glowColor: context.colors.primary,
                ),
                child: notifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              "No notifications yet",
                              style: context.texts.titleLarge,
                            ),
                            const SizedBox(height: 16),
                            Image.asset(
                              "assets/images/no-notification.png",
                              color: context.colors.onSurface,
                              width: 80,
                            )
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: notifications.length,
                        itemBuilder: (ctx, index) => NotificationCard(
                          notification: notifications[index],
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
