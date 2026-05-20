import 'package:app/feature/notifications/domain/models/notification.dart';

final List<AppNotification> dummyNotification = [
  AppNotification(
    id: '1',
    title: 'New Certificate Issued',
    body: 'Your Bachelor of Computer Science certificate has been issued.',
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
    type: AppNotificationType.credentialIssuance,
  ),
  AppNotification(
    id: '2',
    title: 'Attendance List Published',
    body:
        'Attendance list for CS401 - Software Engineering has been published.',
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    type: AppNotificationType.attendenceIssuance,
  ),
  AppNotification(
    id: '3',
    title: 'Certificate Revoked',
    body: 'Your temporary access certificate has been revoked.',
    createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    type: AppNotificationType.credentialsRevoked,
  ),
];

class NotificationDatasource {
  Future<List<AppNotification>> getNotification() async {
    await Future.delayed(Duration(milliseconds: 300));
    return dummyNotification;
  }

  // Stream<AppNotification> get notificationStream =>
  //     socketService.on('notification').map((data) => AppNotification.fromJson(data));

  Future<void> markAllAsRead() async {
    //await dio.delete('/notifications');
  }

  Future<void> markAsRead(String id) async {
    //await dio.delete('/notifications/$id');
  }
}
