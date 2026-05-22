import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:flutter/material.dart';
import 'package:app/feature/notifications/data/datasources/notification_datasource.dart';
import 'package:app/feature/notifications/data/repos_impl/notification_repo_impl.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:app/feature/notifications/domain/repos/notification_repo.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class NotificationController
    extends StateNotifier<AsyncValue<List<AppNotification>>> {
  NotificationController(
    this.notificationRepo, {
    this.onCredentialChanged,
    this.onCredentialDetailChanged,
  }) : super(const AsyncValue.loading()) {
    loadNotifications();
    // _subscribeToSocket();
  }

  // void _subscribeToSocket() {
  //   notificationRepo.notificationStream.listen((notification) {
  //     final current = state.asData?.value ?? [];
  //     state = AsyncValue.data([notification, ...current]);
  //     if (notification.credentialId != null) {
  //       onCredentialChanged?.call();
  //       onCredentialDetailChanged?.call(notification.credentialId!);
  //     }
  //   });
  // }

  final NotificationRepo notificationRepo;
  final VoidCallback? onCredentialChanged;
  final void Function(String id)? onCredentialDetailChanged;

  Future<void> loadNotifications() async {
    state = const AsyncValue.loading();
    try {
      final notifications = await notificationRepo.getNotification();
      state = AsyncValue.data(notifications);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
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
  (ref) => NotificationController(
    ref.watch(notificationRepoProvider),
    onCredentialChanged: () =>
        ref.read(credentialControllerProvider.notifier).loadCredentials(),
    onCredentialDetailChanged: (id) =>
        ref.invalidate(credentialDetailProvider(id)),
  ),
);

final unreadCountProvider = Provider<int>(
  (ref) =>
      ref.watch(notificationControllerProvider).asData?.value.length ?? 0,
);
