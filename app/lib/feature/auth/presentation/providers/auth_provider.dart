import 'dart:convert';

import 'package:app/core/network/api_client.dart';
import 'package:app/feature/auth/presentation/providers/appkit_provider.dart';
import 'package:app/core/services/token_storage_services.dart';
import 'package:app/feature/auth/data/datasources/auth_datasource.dart';
import 'package:app/feature/auth/data/repos_impl/auth_repo_impl.dart';
import 'package:app/feature/auth/domain/models/auth_token.dart';
import 'package:app/feature/auth/domain/repos/auth_repo.dart';
import 'package:app/feature/notifications/presentation/providers/notification_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:reown_appkit/reown_appkit.dart';

class AuthController extends StateNotifier<AsyncValue<AuthToken?>> {
  AuthController({
    required this.authRepo,
    required this.tokenStorage,
    required this.appKitModal,
    required this.onLogout,
    this.onLogin,
  }) : super(const AsyncValue.data(null));

  final AuthRepo authRepo;
  final TokenStorageService tokenStorage;
  final ReownAppKitModal? appKitModal;
  final void Function() onLogout;
  final void Function(String accessToken)? onLogin;

  Future<void> signIn() async {
    final modal = appKitModal;
    if (modal == null) return;

    state = const AsyncValue.loading();
    try {
      if (!modal.isConnected) {
        await modal.openModalView();
      }

      if (!modal.isConnected) {
        state = const AsyncValue.data(null);
        return;
      }

      final address = modal.session!.getAddress('eip155')!;
      final chainId = modal.selectedChain!.chainId;
      //fetch the nonce
      final message = await authRepo.getNonce(address);

      final hexMessage = bytesToHex(utf8.encode(message), include0x: true);
      //sign the message using metamask
      final signature = await modal.request(
        topic: modal.session!.topic,
        chainId: chainId,
        request: SessionRequestParams(
          method: 'personal_sign',
          params: [hexMessage, address],
        ),
      );

      //verify the signed message to get tokens if success
      final token =
          await authRepo.verifySignature(address, signature as String);

      await tokenStorage.saveTokens(token.accessToken, token.refreshToken);

      state = AsyncValue.data(token);
      onLogin?.call(token.accessToken);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
  }

  Future<void> refreshToken() async {
    try {
      final storedRefreshToken = await tokenStorage.getRefreshToken();
      if (storedRefreshToken == null) {
        state = const AsyncValue.data(null);
        return;
      }

      final token = await authRepo.refreshAccessToken(storedRefreshToken);
      await tokenStorage.saveTokens(token.accessToken, token.refreshToken);
      state = AsyncValue.data(token);
      onLogin?.call(token.accessToken);
    } catch (_) {
      await tokenStorage.clearTokens();
      state = const AsyncValue.data(null);
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await authRepo.logout(refreshToken);
      }
      await appKitModal?.disconnect();
    } finally {
      await tokenStorage.clearTokens();
      state = const AsyncValue.data(null);
      onLogout();
    }
  }
}

final hasSessionProvider = FutureProvider<bool>((ref) async {
  final token = await ref.read(tokenStorageServiceProvider).getAccessToken();
  return token != null;
});

final authDatasourceProvider = Provider<AuthDatasource>(
  (ref) => AuthDatasource(ref.watch(dioProvider)),
);

final authRepositoryProvider = Provider<AuthRepo>(
  (ref) => AuthRepoImpl(datasource: ref.watch(authDatasourceProvider)),
);

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<AuthToken?>>(
  (ref) => AuthController(
    authRepo: ref.watch(authRepositoryProvider),
    tokenStorage: ref.watch(tokenStorageServiceProvider),
    appKitModal: ref.watch(appKitModalProvider),
    onLogout: () {
      ref.read(appKitModalProvider.notifier).state = null;
      ref.read(notificationRepoProvider).disconnect();
    },
    onLogin: (accessToken) =>
        ref.read(notificationRepoProvider).connect(accessToken),
  ),
);
