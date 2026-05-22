import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/domain/repos/notification_repo.dart';

class NotificationRepoImpl implements NotificationRepo {
  const NotificationRepoImpl(this.dataSource);
  final NotificationDatasource dataSource;

  @override
  Future<List<AppNotification>> getNotification() async {
    final notifications = await dataSource.getNotification();
    return notifications;
  }

  @override
  Future<void> markAllAsRead() async {
    await dataSource.markAllAsRead();
  }

  // @override
  // Stream<AppNotification> get notificationStream => dataSource.notificationStream;
}
