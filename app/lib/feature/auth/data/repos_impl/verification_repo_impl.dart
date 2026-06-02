import 'package:app/feature/auth/data/datasources/verification_datasource.dart';
import 'package:app/feature/auth/domain/repos/verification_repo.dart';

class VerificationRepoImpl implements VerificationRepo {
  const VerificationRepoImpl({required this.datasource});

  final VerificationDatasource datasource;

  @override
  Future<String> sendVerificationEmail(String email) {
    return datasource.sendVerificationEmail(email);
  }

  @override
  Future<String> requestIssuance(String email, String otp, String signedNonce) {
    return datasource.requestIssuance(email, otp, signedNonce);
  }
}
