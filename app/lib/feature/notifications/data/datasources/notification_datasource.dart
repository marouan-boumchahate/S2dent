import 'package:app/feature/notifications/domain/models/notification.dart';

final List<AppNotification> dummyNotification = [
  AppNotification(
    id: '1',
    title: 'New Certificate Issued',
    body: 'Your Bachelor of Computer Science certificate has been issued.',
    isRead: false,
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
    type: AppNotificationType.credentialIssuance,
  ),
  AppNotification(
    id: '2',
    title: 'Attendance List Published',
    body:
        'Attendance list for CS401 - Software Engineering has been published.',
    isRead: false,
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    type: AppNotificationType.attendenceIssuance,
  ),
  AppNotification(
    id: '3',
    title: 'Certificate Revoked',
    body: 'Your temporary access certificate has been revoked.',
    isRead: false,
    createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    type: AppNotificationType.credentialsRevoked,
  ),
  AppNotification(
    id: '4',
    title: 'System Update',
    body: 'The platform will be under maintenance on Friday at 2:00 AM.',
    isRead: true,
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    type: AppNotificationType.general,
  ),
  AppNotification(
    id: '5',
    title: 'New Certificate Issued',
    body: 'Your academic transcript has been issued.',
    isRead: true,
    createdAt: DateTime.now().subtract(const Duration(days: 3)),
    type: AppNotificationType.credentialIssuance,
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
    //await dio.patch('/notifications/readAll);
  }
  Future<void> markAsRead(String id) async {
    //await dio.patch('/notifications/$id/read);
  }
}
