import 'package:app/feature/auth/domain/models/auth_token.dart';
import 'package:dio/dio.dart';

class AuthDatasource {
  const AuthDatasource(this._dio);

  final Dio _dio;

  Future<String> getNonce(String walletAddress) async {
    final response = await _dio.get(
      '/nonce',
      queryParameters: {'address': walletAddress},
    );
    return response.data['message'] as String;
  }

  Future<AuthToken> verifySignature(
    String walletAddress,
    String signature,
  ) async {
    final response = await _dio.post(
      '/verify',
      data: {'address': walletAddress, 'signature': signature},
    );

    if (response.data['success'] != true) {
      throw Exception('Authentication failed');
    }

    return AuthToken.fromJson(response.data['data']);
  }

  Future<AuthToken> refreshAccessToken(String refreshToken) async {
    final response = await _dio.post(
      '/refresh',
      data: {'refreshToken': refreshToken},
    );

    if (response.data['success'] != true) {
      throw Exception('Token refresh failed');
    }

    return AuthToken.fromJson(response.data['data']);
  }

  Future<void> logout(String refreshToken) async {
    await _dio.post(
      '/logout',
      data: {'refreshToken': refreshToken},
    );
  }
}
