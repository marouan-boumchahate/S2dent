import 'package:app/feature/credentials/domain/models/credential.dart';

abstract class CredentialRepo {
  Future<List<Credential>> getCredentials();
}
