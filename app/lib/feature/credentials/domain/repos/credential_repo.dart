import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';

abstract class CredentialRepo {
  Future<List<CredentialItem>> getCredentials();
  Future<Credential> getCredentialById(String id);
  void clearDetailCache();
}
