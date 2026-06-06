import 'package:app/feature/qr/domain/models/verification_result.dart';
import 'package:dio/dio.dart';

class QRDatasource {
  const QRDatasource(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> getSignatureSchema(String credentialId) async {
    final response =
        await _dio.get("/credentials/$credentialId/signature-schema");
    final data =
        response.data["data"]["signature_schema"] as Map<String, dynamic>;
    return data;
  }

  Future<String> getVerifierToken(
    String credentialId,
    String studentAddress,
    String studentSignature,
    int? expirationTimeInSeconds,
  ) async {
    final response = await _dio.post("/credentials/$credentialId/token", data: {
      "student_address": studentAddress,
      "student_signature": studentSignature,
      if (expirationTimeInSeconds != null)
        "expiration_time_in_seconds": expirationTimeInSeconds,
    });
    final token = response.data["data"] as String;
    return token;
  }

  Future<VerificationResult> getVerificationResult(String token) async {
    final response = await _dio.get(
      "/credentials/verification",
      options: Options(headers: {
        'Authorization': 'Bearer $token',
      }),
    );
    return VerificationResult.fromJson(response.data["data"]);
  }
}
