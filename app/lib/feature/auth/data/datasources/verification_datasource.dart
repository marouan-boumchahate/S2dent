import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class VerificationDatasource {
  const VerificationDatasource(this._dio);

  final Dio _dio;

  Future<String> sendVerificationEmail(String email) async {
    debugPrint("Verification - Send OTP API has been called");
    final response = await _dio.post(
      '/auth/otp/send',
      data: {'email': email},
    );
    return response.data['data']['message'] as String;
  }

  Future<String> requestIssuance(
    String email,
    String otp,
    String signedNonce,
  ) async {
    debugPrint("Verification - Request issuance API has been called");
    final response = await _dio.post(
      '/identity/students/request-issuance',
      data: {'email': email, 'otp': otp, 'signature': signedNonce},
    );

    if (response.data['success'] != true) {
      throw Exception('Issuance request failed');
    }

    return response.data['data']['wallet_address'] as String;
  }
}
