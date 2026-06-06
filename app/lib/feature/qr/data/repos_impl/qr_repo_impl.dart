import 'package:app/feature/qr/data/datasources/qr_datasource.dart';
import 'package:app/feature/qr/domain/models/verification_result.dart';
import 'package:app/feature/qr/domain/repos/qr_repo.dart';

class QRRepoImpl implements QRRepo {
  const QRRepoImpl(this._dataSource);
  final QRDatasource _dataSource;

  @override
  Future<Map<String, dynamic>> getSignatureSchema(String credentialId) {
    return _dataSource.getSignatureSchema(credentialId);
  }

  @override
  Future<String> getVerifierToken(
    String credentialId,
    String studentAddress,
    String studentSignature,
    int? expirationTimeInSeconds,
  ) {
    return _dataSource.getVerifierToken(
      credentialId,
      studentAddress,
      studentSignature,
      expirationTimeInSeconds,
    );
  }

  @override
  Future<VerificationResult> getVerificationResult(String token) {
    return _dataSource.getVerificationResult(token);
  }
}
