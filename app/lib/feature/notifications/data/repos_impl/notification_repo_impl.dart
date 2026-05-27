import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/domain/repos/notification_repo.dart';

class NotificationRepoImpl implements NotificationRepo {
  const NotificationRepoImpl(this.dataSource);
  final NotificationDatasource dataSource;

  @override
  void ackEvent(String eventId) {
    dataSource.ackEvent(eventId);
  }

  @override
  void connect(String accessToken) {
    dataSource.connect(accessToken);
  }

  @override
  void disconnect() {
    dataSource.disconnect();
  }

  @override
  Stream<AppNotification> get notificationStream {
    return dataSource.notificationStream;
  }
}
