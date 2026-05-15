import 'package:app/feature/credentials/data/datasources/credential_datasource.dart';
import 'package:app/feature/credentials/data/repos_impl/credential_repo_impl.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/repos/credential_repo.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class CredentialController extends StateNotifier<AsyncValue<List<Credential>>> {
  CredentialController(this.credRepo) : super(const AsyncValue.loading()) {
    //load credentials immediately
    loadCredentials();
  }

  final CredentialRepo credRepo;

  Future<void> loadCredentials() async {
    state = const AsyncValue.loading();
    try {
      final credentials = await credRepo.getCredentials();
      state = AsyncValue.data(credentials);
    } catch (e, trace) {
      state = AsyncValue.error(e, trace);
    }
  }
}

final credentialDatasourceProvider = Provider<CredentialDatasource>(
  (ref) => CredentialDatasource(),
);

final credentialRepositoryProvider = Provider<CredentialRepo>(
  (ref) =>
      CredentialRepoImpl(datasource: ref.watch(credentialDatasourceProvider)),
);

final credentialControllerProvider =
    StateNotifierProvider<CredentialController, AsyncValue<List<Credential>>>(
  (ref) => CredentialController(ref.watch(credentialRepositoryProvider)),
);
