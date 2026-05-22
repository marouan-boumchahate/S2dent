import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:flutter/rendering.dart';

final List<AppNotification> dummyNotification = [
  AppNotification(
    id: '1',
    title: 'New Certificate Issued',
    body: 'Your Bachelor of Computer Science certificate has been issued.',
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
    type: AppNotificationType.credentialIssuance,
    credentialId: '4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea',
  ),
  AppNotification(
    id: '2',
    title: 'Attendance List Published',
    body:
        'Attendance list for CS401 - Software Engineering has been published.',
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    type: AppNotificationType.attendenceIssuance,
    credentialId: '2ef45678-789a-11ee-b962-0242ac120004',
  ),
  AppNotification(
    id: '3',
    title: 'Certificate Revoked',
    body: 'Your temporary access certificate has been revoked.',
    createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    type: AppNotificationType.credentialsRevoked,
    credentialId: '4gh67890-789a-11ee-b962-0242ac120006',
  ),
];

class NotificationDatasource {
  Future<List<AppNotification>> getNotification() async {
    await Future.delayed(Duration(milliseconds: 300));
    debugPrint("Notifications List API has been called");
    return dummyNotification;
  }

  // Stream<AppNotification> get notificationStream =>
  //     socketService.on('notification').map((data) => AppNotification.fromJson(data));

  Future<void> markAllAsRead() async {
    debugPrint("Mark all notifications as read API has been called");
    //await dio.delete('/notifications');
  }
}
