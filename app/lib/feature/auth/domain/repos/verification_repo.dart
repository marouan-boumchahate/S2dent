abstract class VerificationRepo {
  Future<String> sendVerificationEmail(String email);
  Future<String> requestIssuance(String email, String otp, String signedNonce);
}
