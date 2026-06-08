import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:app/core/navigation/navigator_key_provider.dart';
import 'package:app/core/navigation/shell_page.dart';
import 'package:app/core/navigation/shell_page_index_provider.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/feature/role_selection/presentation/pages/role_selection.dart';
import 'package:app/feature/auth/presentation/providers/session_expired_provider.dart';
import 'package:app/core/services/pk_storage.service.dart';
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
    required this.pkStorage,
    required this.getAppKitModal,
    required this.onLogout,
    this.onLogin,
  }) : super(const AsyncValue.loading()) {
    _restoreSession();
  }

  final AuthRepo authRepo;
  final TokenStorageService tokenStorage;
  final PKStorageService pkStorage;
  final ReownAppKitModal? Function() getAppKitModal;
  final void Function() onLogout;
  final void Function(String accessToken)? onLogin;
  bool _isLoggingOut = false;

  Future<void> _restoreSession() async {
    final accessToken = await tokenStorage.getAccessToken();
    final refreshToken = await tokenStorage.getRefreshToken();
    if (accessToken != null && refreshToken != null) {
      state = AsyncValue.data(
        AuthToken(accessToken: accessToken, refreshToken: refreshToken),
      );
    } else {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> signIn() async {
    final modal = getAppKitModal();
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
      await pkStorage.handleWalletChange(address);

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
    if (_isLoggingOut) return;
    _isLoggingOut = true;
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await authRepo.logout(refreshToken);
      }
      await getAppKitModal()?.disconnect();
    } finally {
      await tokenStorage.clearTokens();
      state = const AsyncValue.data(null);
      onLogout();
      _isLoggingOut = false;
    }
  }
}

final hasSessionProvider = Provider<AsyncValue<bool>>((ref) {
  return ref.watch(authControllerProvider).whenData((token) => token != null);
});

final authDatasourceProvider = Provider<AuthDatasource>(
  (ref) => AuthDatasource(ref.watch(dioProvider)),
);

final authRepositoryProvider = Provider<AuthRepo>(
  (ref) => AuthRepoImpl(datasource: ref.watch(authDatasourceProvider)),
);

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<AuthToken?>>(
  (ref) {
    final controller = AuthController(
      authRepo: ref.watch(authRepositoryProvider),
      tokenStorage: ref.watch(tokenStorageServiceProvider),
      pkStorage: ref.watch(pkStorageServiceProvider),
      getAppKitModal: () => ref.read(appKitModalProvider),
      onLogout: () {
        ref.read(shellPageIndexProvider.notifier).state = 0;
        ref.read(appKitModalProvider.notifier).state = null;
        ref.read(notificationRepoProvider).disconnect();
        ref.read(navigatorKeyProvider).currentState?.pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const RoleSelectionPage()),
              (route) => false,
            );
      },
      onLogin: (accessToken) {
        ref.read(sessionExpiredProvider.notifier).state = false;
        ref.read(notificationRepoProvider).connect(accessToken);
        ref.read(navigatorKeyProvider).currentState?.pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const ShellPage()),
              (route) => false,
            );
      },
    );

    ref.listen(sessionExpiredProvider, (previous, expired) {
      if (expired == true && previous != true) {
        controller.logout();
      }
    });

    return controller;
  },
);
