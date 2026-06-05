abstract class QRRepo {
  Future<Map<String, dynamic>> getSignatureSchema(String credentialId);
  Future<String> getVerifierToken(
      String credentialId, String studentAddress, String studentSignature);
}
