import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/data/repos_impl/notification_repo_impl.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationController extends Notifier<List<AppNotification>> {
  @override
  List<AppNotification> build() {
    final repo = ref.watch(notificationRepoProvider);
    final subscription = repo.notificationStream.listen(
      (event) {
        state = [event, ...state];
        //fetch the credentials again to update their state after the adjustment
        // (new credential issuance or revoking etc...)
        ref.read(credentialControllerProvider.notifier).loadCredentials();
      },
    );
    ref.onDispose(subscription.cancel);
    // temporary dummy data
    return [
      AppNotification(
        eventId: '1',
        txHash: '0xabc123',
        message: 'Your credential has been successfully issued.',
        createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
        status: AppNotificationStatus.verified,
      ),
      AppNotification(
        eventId: '2',
        txHash: '0xdef456',
        message: 'Transaction failed. Please try again.',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        status: AppNotificationStatus.failed,
      ),
    ];
  }

  void ackAll() {
    final repo = ref.read(notificationRepoProvider);
    for (final notification in state) {
      repo.ackEvent(notification.eventId);
    }
    state = [];
  }
}

final notificationDataSourceProvider = Provider(
  (ref) {
    final dataSource = NotificationDatasource();
    ref.onDispose(dataSource.disconnect);
    return dataSource;
  },
);
final notificationRepoProvider = Provider(
  (ref) => NotificationRepoImpl(ref.watch(notificationDataSourceProvider)),
);
final notificationControllerProvider =
    NotifierProvider<NotificationController, List<AppNotification>>(
  NotificationController.new,
);
final unreadCountProvider = Provider<int>(
  (ref) => ref.watch(notificationControllerProvider).length,
);
