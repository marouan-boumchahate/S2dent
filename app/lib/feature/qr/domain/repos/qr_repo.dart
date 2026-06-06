import 'package:app/feature/qr/domain/models/verification_result.dart';

abstract class QRRepo {
  Future<Map<String, dynamic>> getSignatureSchema(String credentialId);
  Future<String> getVerifierToken(
    String credentialId,
    String studentAddress,
    String studentSignature,
    int? expirationTimeInSeconds,
  );
  Future<VerificationResult> getVerificationResult(String token);
}
