import 'package:app/feature/credentials/domain/models/credential_item.dart';

class Credential {
  const Credential({
    required this.id,
    required this.title,
    required this.code,
    required this.type,
    required this.issuerAddress,
    required this.academyAddress,
    required this.studentAddress,
    required this.studentName,
    required this.issuedAt,
    required this.isRevoked,
    required this.issueTxHash,
    this.revokeTxHash,
    this.revocationReason,
    this.description,
    required this.credentialIndex,
    required this.payloadHash,
    required this.signature,
    required this.encryptedPayload,
  });

  final String id;
  final String title;
  final String code;
  final CredentialItemType type;
  final String issuerAddress;
  final String academyAddress;
  final String studentAddress;
  final String studentName;
  final DateTime? issuedAt;
  final bool isRevoked;
  final String issueTxHash;
  final String? revokeTxHash;
  final String? revocationReason;
  final String? description;
  final int credentialIndex;
  final String payloadHash;
  final String signature;
  final String encryptedPayload;

  factory Credential.fromJson(Map<String, dynamic> json) {
    final meta = json["meta"] as Map<String, dynamic>;
    final student = json["student"] as Map<String, dynamic>;
    final blockchain = json["blockchain"] as Map<String, dynamic>;
    final verification = json["verification"] as Map<String, dynamic>;

    return Credential(
      id: meta["id"] ?? "",
      title: meta["title"] ?? "",
      code: meta["code"] ?? "",
      type: credentialItemTypeFromJson(meta["type"]),
      issuedAt:
          meta["issued_at"] != null ? DateTime.parse(meta["issued_at"]) : null,
      isRevoked: meta["is_revoked"] ?? false,
      //this can be null, and if null we need to capture it (cuz its optional)
      description: meta["description"],
      studentAddress: student["address"] ?? "",
      studentName: student["name"] ?? "",
      issueTxHash: blockchain["issue_tx_hash"] ?? "",
      revokeTxHash: blockchain["revoke_tx_hash"],
      revocationReason: blockchain["revocation_reason"],
      credentialIndex: blockchain["credential_index"] ?? 0,
      academyAddress: blockchain["academy_address"] ?? "",
      issuerAddress: blockchain["issuer_address"] ?? "",
      payloadHash: verification["payload_hash"] ?? "",
      signature: verification["signature"] ?? "",
      encryptedPayload: json["encryptedPayload"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "meta": {
        "id": id,
        "title": title,
        "code": code,
        "type": type.name,
        "issued_at": issuedAt?.toIso8601String(),
        "is_revoked": isRevoked,
        "description": description,
      },
      "student": {
        "address": studentAddress,
        "name": studentName,
      },
      "blockchain": {
        "issue_tx_hash": issueTxHash,
        "revoke_tx_hash": revokeTxHash,
        "revocation_reason": revocationReason,
        "credential_index": credentialIndex,
        "academy_address": academyAddress,
        "issuer_address": issuerAddress,
      },
      "verification": {
        "payload_hash": payloadHash,
        "signature": signature,
      },
      "encryptedPayload": encryptedPayload,
    };
  }
}
