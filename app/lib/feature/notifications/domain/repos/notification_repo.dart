import 'package:app/feature/notifications/domain/models/notification.dart';

abstract class NotificationRepo {
  Future<List<AppNotification>> getNotification();
  Future<void> markAsRead(String notificationId);
  Future<void> markAllAsRead();
  // Stream<AppNotification> get notificationStream;
}
