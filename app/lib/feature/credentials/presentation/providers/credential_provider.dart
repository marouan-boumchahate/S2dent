import 'package:app/core/network/api_client.dart';
import 'package:app/feature/credentials/data/datasources/credential_datasource.dart';
import 'package:app/feature/credentials/data/repos_impl/credential_repo_impl.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/domain/repos/credential_repo.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class CredentialController
    extends StateNotifier<AsyncValue<List<CredentialItem>>> {
  CredentialController(this.credRepo) : super(const AsyncValue.loading()) {
    //load credentials immediately
    loadCredentials();
  }

  final CredentialRepo credRepo;

  Future<void> loadCredentials() async {
    state = const AsyncValue.loading();
    //clear cache so we fetch the credentials once again on opening a credential detail
    credRepo.clearDetailCache();
    try {
      final credentials = await credRepo.getCredentials();
      state = AsyncValue.data(credentials);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
  }

  //refresh credentials silently when a notification comes
  Future<void> refreshSilently() async {
    credRepo.clearDetailCache();
    try {
      final credentials = await credRepo.getCredentials();
      //set state immediately to new data instead of data -> loading -> data
      state = AsyncValue.data(credentials);
    } catch (_) {}
  }
}

final credentialDatasourceProvider = Provider<CredentialDatasource>(
  (ref) => CredentialDatasource(ref.watch(dioProvider)),
);

final credentialRepositoryProvider = Provider<CredentialRepo>(
  (ref) =>
      CredentialRepoImpl(datasource: ref.watch(credentialDatasourceProvider)),
);

final credentialControllerProvider = StateNotifierProvider<CredentialController,
    AsyncValue<List<CredentialItem>>>(
  (ref) => CredentialController(ref.watch(credentialRepositoryProvider)),
);

final credentialDetailProvider = FutureProvider.family<Credential, String>(
  (ref, id) => ref.watch(credentialRepositoryProvider).getCredentialById(id),
);
