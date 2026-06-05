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
  ) async {
    final response = await _dio.post("/credentials/$credentialId/token", data: {
      "student_address": studentAddress,
      "student_signature": studentSignature,
    });
    final token = response.data["data"] as String;
    return token;
  }
}
