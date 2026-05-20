import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/data/repos_impl/notification_repo_impl.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/domain/repos/notification_repo.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class NotificationController
    extends StateNotifier<AsyncValue<List<AppNotification>>> {
  NotificationController(this.notificationRepo)
      : super(const AsyncValue.loading()) {
    loadNotifications();
    // _subscribeToSocket();
  }

  // void _subscribeToSocket() {
  //   notificationRepo.notificationStream.listen((notification) {
  //     final current = state.asData?.value ?? [];
  //     state = AsyncValue.data([notification, ...current]);
  //   });
  // }

  final NotificationRepo notificationRepo;

  Future<void> loadNotifications() async {
    state = const AsyncValue.loading();
    try {
      final notifications = await notificationRepo.getNotification();
      state = AsyncValue.data(notifications);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
  }

  Future<void> markAsRead(String id) async {
    final notifications = state.asData?.value;
    if (notifications == null) return;
    state = AsyncValue.data(
      notifications.where((n) => n.id != id).toList(),
    );
    await notificationRepo.markAsRead(id);
  }

  Future<void> markAllAsRead() async {
    state = const AsyncValue.data([]);
    await notificationRepo.markAllAsRead();
  }
}

final notificationDatasourceProvider = Provider<NotificationDatasource>(
  (ref) => NotificationDatasource(),
);

final notificationRepoProvider = Provider<NotificationRepo>(
  (ref) => NotificationRepoImpl(ref.watch(notificationDatasourceProvider)),
);

final notificationControllerProvider = StateNotifierProvider<
    NotificationController, AsyncValue<List<AppNotification>>>(
  (ref) => NotificationController(ref.watch(notificationRepoProvider)),
);

final unreadCountProvider = Provider<int>(
  (ref) =>
      ref.watch(notificationControllerProvider).asData?.value.length ?? 0,
);
