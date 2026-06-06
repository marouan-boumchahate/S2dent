import 'package:app/feature/qr/domain/models/verification.dart';
import 'package:app/feature/qr/domain/models/verification_blockchain.dart';
import 'package:app/feature/qr/domain/models/verification_meta.dart';
import 'package:app/feature/qr/domain/models/verification_student.dart';

class VerificationResult {
  const VerificationResult({
    required this.verificationMeta,
    required this.verificationStudent,
    required this.verificationBlockchain,
    required this.verification,
    required this.payload,
  });

  final VerificationMeta verificationMeta;
  final VerificationStudent verificationStudent;
  final VerificationBlockchain verificationBlockchain;
  final Verification verification;
  final Map<String, dynamic> payload;

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    return VerificationResult(
      verificationMeta: VerificationMeta.fromJson(json["meta"]),
      verificationStudent: VerificationStudent.fromJson(json["student"]),
      verificationBlockchain:
          VerificationBlockchain.fromJson(json["blockchain"]),
      verification: Verification.fromJson(json["verification"]),
      payload: Map<String, dynamic>.from(json["payload"] ?? {}),
    );
  }
}
