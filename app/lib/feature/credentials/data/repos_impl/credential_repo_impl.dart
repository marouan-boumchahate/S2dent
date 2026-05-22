import 'package:app/feature/credentials/data/datasources/credential_datasource.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/domain/repos/credential_repo.dart';

class CredentialRepoImpl implements CredentialRepo {
  const CredentialRepoImpl({required this.datasource});

  final CredentialDatasource datasource;

  @override
  Future<List<CredentialItem>> getCredentials() {
    return datasource.getCredentials();
  }

  @override
  Future<Credential> getCredentialById(String id) {
    return datasource.getCredentialById(id);
  }

  @override
  void clearDetailCache() => datasource.clearDetailCache();
}
