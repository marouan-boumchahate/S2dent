import 'package:app/feature/credentials/domain/models/credential.dart';

class HomeData {
  const HomeData({
    this.firstName,
    this.walletAddress,
    this.credentialsCount,
    this.cgpa,
    this.enrollmentStatus,
    this.recentCredentials,
    this.credentialsList,
  });

  final String? firstName;
  final String? walletAddress;
  final int? credentialsCount;
  final double? cgpa;
  final String? enrollmentStatus;
  final List<Credential>? recentCredentials;
  final List<Credential>? credentialsList;
}
