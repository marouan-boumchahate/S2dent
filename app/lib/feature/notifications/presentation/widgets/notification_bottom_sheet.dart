import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/core/widgets/ui/custom_overscroll_glow.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/presentation/providers/notification_provider.dart';
import 'package:app/feature/notifications/presentation/widgets/notification_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationsBottomSheet extends ConsumerStatefulWidget {
  const NotificationsBottomSheet({super.key});

  @override
  ConsumerState<NotificationsBottomSheet> createState() =>
      _NotificationsBottomSheetState();
}

class _NotificationsBottomSheetState
    extends ConsumerState<NotificationsBottomSheet> {
  late NotificationController _notificationController;
  @override
  void initState() {
    super.initState();
    _notificationController = ref.read(notificationControllerProvider.notifier);
  }

  @override
  void dispose() {
    Future(
      () => _notificationController.ackAll(),
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationControllerProvider);

    return _sheetContent(notifications, context);
  }

  SizedBox _sheetContent(
    List<AppNotification> notifications,
    BuildContext context,
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
