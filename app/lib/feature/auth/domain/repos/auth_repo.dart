import 'package:app/feature/auth/domain/models/auth_token.dart';

abstract class AuthRepo {
  Future<String> getNonce(String walletAddress);
  Future<AuthToken> verifySignature(String walletAddress, String signature);
  Future<AuthToken> refreshAccessToken(String refreshToken);
  Future<void> logout(String refreshToken);
}
