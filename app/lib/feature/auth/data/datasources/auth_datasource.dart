import 'package:app/feature/auth/domain/models/auth_token.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class AuthDatasource {
  const AuthDatasource(this._dio);

  final Dio _dio;

  Future<String> getNonce(String walletAddress) async {
    debugPrint("Auth - Get nonce API has been called");
    final response = await _dio.get(
      '/auth/nonce',
      queryParameters: {'wallet_address': walletAddress},
    );
    return response.data['data']['message'] as String;
  }

  Future<AuthToken> verifySignature(
    String walletAddress,
    String signature,
  ) async {
    debugPrint("Auth - Verify signature API has been called");
    final response = await _dio.post(
      '/auth/verify',
      data: {'wallet_address': walletAddress, 'signature': signature},
    );

    if (response.data['success'] != true) {
      throw Exception('Authentication failed');
    }

    return AuthToken.fromJson(response.data['data']);
  }

  Future<AuthToken> refreshAccessToken(String refreshToken) async {
    debugPrint("Auth - Refresh access token API has been called");
    final response = await _dio.post(
      '/auth/refresh',
      data: {'refresh_token': refreshToken},
    );

    if (response.data['success'] != true) {
      throw Exception('Token refresh failed');
    }

    return AuthToken.fromJson(response.data['data']);
  }

  Future<void> logout(String refreshToken) async {
    debugPrint("Auth - Logout API has been called");
    await _dio.delete(
      '/auth/logout',
      data: {'refresh_token': refreshToken},
    );
  }
}
