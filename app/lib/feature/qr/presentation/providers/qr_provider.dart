import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/pk_storage.service.dart';
import 'package:app/core/utils/eip712_sign.dart';
import 'package:app/feature/qr/data/datasources/qr_datasource.dart';
import 'package:app/feature/qr/data/repos_impl/qr_repo_impl.dart';
import 'package:app/feature/qr/domain/repos/qr_repo.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class QrController extends StateNotifier<AsyncValue<String?>> {
  QrController(this._repo, this._pkService, this._credentialId)
      : super(const AsyncValue.loading()) {
    generate();
  }

  final QRRepo _repo;
  final PKStorageService _pkService;
  final String _credentialId;

  Future<void> generate() async {
    state = const AsyncValue.loading();
    try {
      final pk = await _pkService.getPK();
      if (pk == null) {
        state = AsyncValue.error('NO PK FOUND', StackTrace.current);
        return;
      }
      final address = await _pkService.getAddress();
      if (address == null) {
        state = AsyncValue.error('NO PUBLIC ADDRESS FOUND', StackTrace.current);
        return;
      }
      final schema = await _repo.getSignatureSchema(_credentialId);
      final signature = signEIP712(pk, schema);
      final token =
          await _repo.getVerifierToken(_credentialId, address, signature);
      state = AsyncValue.data(token);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
  }
}

final qrDatasourceProvider = Provider<QRDatasource>(
  (ref) => QRDatasource(ref.watch(dioProvider)),
);

final qrRepositoryProvider = Provider<QRRepo>(
  (ref) => QRRepoImpl(ref.watch(qrDatasourceProvider)),
);

final qrControllerProvider = StateNotifierProvider.family
    .autoDispose<QrController, AsyncValue<String?>, String>(
  (ref, credentialId) => QrController(
    ref.watch(qrRepositoryProvider),
    ref.watch(pkStorageServiceProvider),
    credentialId,
  ),
);
