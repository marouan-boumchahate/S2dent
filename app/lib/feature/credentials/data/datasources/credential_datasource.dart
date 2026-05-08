import 'package:app/feature/credentials/domain/models/credential.dart';

class CredentialDatasource {
  final List<Map<String, dynamic>> _credentialsJson = [
    {
      "id": "cred_001",
      "title": "Bachelor of Computer Engineering",
      "type": "degree",
      "issuer_name": "Fenerbahce University",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2026-06-30T00:00:00.000Z",
      "expires_at": null,
      "status": "valid",
      "transaction_hash":
          "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      "description":
          "Awarded upon successful completion of the 4-year Computer Engineering program.",
    },
    {
      "id": "cred_002",
      "title": "Official Academic Transcript",
      "type": "transcript",
      "issuer_name": "Fenerbahce University",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2026-01-15T00:00:00.000Z",
      "expires_at": null,
      "status": "valid",
      "transaction_hash":
          "0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7",
      "description": "Official transcript for the 2025-2026 academic year.",
    },
    {
      "id": "cred_003",
      "title": "Proof of Enrollment",
      "type": "enrollment",
      "issuer_name": "Fenerbahce University",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2022-09-19T00:00:00.000Z",
      "expires_at": "2026-06-30T00:00:00.000Z",
      "status": "valid",
      "transaction_hash":
          "0x111aaa222bbb333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111a",
      "description":
          "Confirms active enrollment in the Computer Engineering department.",
    },
    {
      "id": "cred_004",
      "title": "Data Structures — Attendance",
      "type": "attendance",
      "issuer_name": "Fenerbahce University",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2025-12-20T00:00:00.000Z",
      "expires_at": null,
      "status": "valid",
      "transaction_hash":
          "0x222bbb333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222b",
      "description":
          "Attendance record for Data Structures course — Fall 2025.",
    },
    {
      "id": "cred_005",
      "title": "Dean's List — Fall 2025",
      "type": "achievement",
      "issuer_name": "Fenerbahce University",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2026-01-10T00:00:00.000Z",
      "expires_at": null,
      "status": "valid",
      "transaction_hash":
          "0x333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222fff333c",
      "description":
          "Awarded for achieving a GPA of 3.8 or above during Fall 2025 semester.",
    },
    {
      "id": "cred_006",
      "title": "Flutter Development Bootcamp",
      "type": "certificate",
      "issuer_name": "Google Developers",
      "issued_to": "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390",
      "issued_at": "2025-08-05T00:00:00.000Z",
      "expires_at": "2027-08-05T00:00:00.000Z",
      "status": "valid",
      "transaction_hash":
          "0x444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222fff333aaa444d",
      "description":
          "Certificate of completion for the Flutter & Dart development bootcamp.",
    },
  ];

  Future<List<Credential>> getCredentials() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _credentialsJson
        .map((credential) => Credential.fromJson(credential))
        .toList();
  }
}
