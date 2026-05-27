import 'package:app/feature/notifications/domain/models/notification.dart';

abstract class NotificationRepo {
  Stream<AppNotification> get notificationStream;
  void connect(String accessToken);
  void disconnect();
  void ackEvent(String eventId);
}
