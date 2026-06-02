import 'dart:convert';

import 'package:app/core/network/api_client.dart';
import 'package:app/feature/auth/data/datasources/verification_datasource.dart';
import 'package:app/feature/auth/data/repos_impl/verification_repo_impl.dart';
import 'package:app/feature/auth/domain/repos/verification_repo.dart';
import 'package:app/feature/auth/presentation/providers/appkit_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:reown_appkit/reown_appkit.dart';

class VerificationState {
  const VerificationState({
    this.isLoading = false,
    this.error,
    this.emailSent = false,
    this.isComplete = false,
    this.walletAddress,
  });

  final bool isLoading;
  final String? error;
  final bool emailSent;
  final bool isComplete;
  final String? walletAddress;

  VerificationState copyWith({
    bool? isLoading,
    String? error,
    bool? emailSent,
    bool? isComplete,
    String? walletAddress,
    bool clearError = false,
  }) {
    return VerificationState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : error ?? this.error,
      emailSent: emailSent ?? this.emailSent,
      isComplete: isComplete ?? this.isComplete,
      walletAddress: walletAddress ?? this.walletAddress,
    );
  }
}

class VerificationController extends StateNotifier<VerificationState> {
  VerificationController({
    required this.verificationRepo,
    required this.appKitModal,
  }) : super(const VerificationState());

  final VerificationRepo verificationRepo;
  final ReownAppKitModal? appKitModal;

  String? _email;
  String? _nonce;

  Future<void> sendEmail(String email) async {
    state = state.copyWith(isLoading: true, emailSent: false, clearError: true);
    try {
      final nonce = await verificationRepo.sendVerificationEmail(email);
      _email = email;
      _nonce = nonce;
      state = state.copyWith(isLoading: false, emailSent: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> submitIssuance(String otp) async {
    final modal = appKitModal;
    if (modal == null || _email == null || _nonce == null) return;

    state = state.copyWith(
      isLoading: true,
      isComplete: false,
      clearError: true,
    );
    try {
      if (!modal.isConnected) {
        await modal.openModalView();
      }
      if (!modal.isConnected) {
        state = state.copyWith(isLoading: false);
        return;
      }

      final address = modal.session!.getAddress('eip155')!;
      final chainId = modal.selectedChain!.chainId;
      final hexNonce = bytesToHex(utf8.encode(_nonce!), include0x: true);

      final signature = await modal.request(
        topic: modal.session!.topic,
        chainId: chainId,
        request: SessionRequestParams(
          method: 'personal_sign',
          params: [hexNonce, address],
        ),
      );

      final walletAddress = await verificationRepo.requestIssuance(
        _email!,
        otp,
        signature as String,
      );

      state = state.copyWith(
        isLoading: false,
        isComplete: true,
        walletAddress: walletAddress,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final verificationDatasourceProvider = Provider<VerificationDatasource>(
  (ref) => VerificationDatasource(ref.watch(dioProvider)),
);

final verificationRepositoryProvider = Provider<VerificationRepo>(
  (ref) => VerificationRepoImpl(
    datasource: ref.watch(verificationDatasourceProvider),
  ),
);

final verificationControllerProvider =
    StateNotifierProvider<VerificationController, VerificationState>(
  (ref) => VerificationController(
    verificationRepo: ref.watch(verificationRepositoryProvider),
    appKitModal: ref.watch(appKitModalProvider),
  ),
);
