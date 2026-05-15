import 'package:app/feature/auth/data/datasources/auth_datasource.dart';
import 'package:app/feature/auth/domain/models/auth_token.dart';
import 'package:app/feature/auth/domain/repos/auth_repo.dart';

class AuthRepoImpl implements AuthRepo {
  const AuthRepoImpl({required this.datasource});

  final AuthDatasource datasource;

  @override
  Future<String> getNonce(String walletAddress) {
    return datasource.getNonce(walletAddress);
  }

  @override
  Future<AuthToken> verifySignature(String walletAddress, String signature) {
    return datasource.verifySignature(walletAddress, signature);
  }

  @override
  Future<AuthToken> refreshAccessToken(String refreshToken) {
    return datasource.refreshAccessToken(refreshToken);
  }

  @override
  Future<void> logout(String refreshToken) {
    return datasource.logout(refreshToken);
  }
}
