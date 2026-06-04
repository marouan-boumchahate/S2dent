import 'package:app/core/config/app_config.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/token_storage_services.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/data/repos_impl/notification_repo_impl.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationController extends Notifier<List<AppNotification>> {
  @override
  List<AppNotification> build() {
    final repo = ref.watch(notificationRepoProvider);

    if (!AppConfig.useMockApi) {
      final dio = ref.read(dioProvider);
      final tokenStorage = ref.read(tokenStorageServiceProvider);
      // ping the API first so AuthInterceptor refreshes an expired token,
      // then read the (possibly updated) token from storage before connecting
      dio.get('/helper/health').whenComplete(() {
        tokenStorage.getAccessToken().then((token) {
          if (token != null) repo.connect(token);
        });
      });
      ref.onDispose(repo.disconnect);
    }

    final subscription = repo.notificationStream.listen(
      (event) {
        state = [event, ...state];
        ref.read(credentialControllerProvider.notifier).loadCredentials();
      },
    );
    ref.onDispose(subscription.cancel);

    //FOR DEBUGGING AND TEST ONLY TODO:REMOVE IT AFTER PRODUYCTION
    if (AppConfig.useMockApi) {
      return [
        AppNotification(
          eventId: 'mock-event-001',
          txHash:
              '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
          message:
              'Your credential "Bachelor of Computer Engineering" has been successfully issued on the blockchain.',
          createdAt: DateTime.parse('2026-06-30T10:15:00.000Z'),
          status: AppNotificationStatus.verified,
        ),
        AppNotification(
          eventId: 'mock-event-002',
          txHash:
              '0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7',
          message:
              'Your credential "Proof of Enrollment" has been revoked by the institution.',
          createdAt: DateTime.parse('2026-05-20T08:30:00.000Z'),
          status: AppNotificationStatus.failed,
        ),
      ];
    }

    return [];
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
