enum CredentialType {
  degree,
  certificate,
  transcript,
  enrollment,
  achievement,
  attendance,
  unknown,
}

enum CredentialStatus {
  valid,
  revoked,
  expired,
  unknown,
}

CredentialType credentialTypeFromJson(Object? value) {
  if (value is CredentialType) return value;
  return CredentialType.values.firstWhere(
    (element) => element.name == value,
    orElse: () => CredentialType.unknown,
  );
}

CredentialStatus credentialStatusFromBool(bool? isRevoked) {
  if (isRevoked == null) return CredentialStatus.unknown;
  return isRevoked ? CredentialStatus.revoked : CredentialStatus.valid;
}

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
    required this.status,
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
  final CredentialType type;
  final String issuerAddress;
  final String academyAddress;
  final String studentAddress;
  final String studentName;
  final DateTime issuedAt;
  final CredentialStatus status;
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
      type: credentialTypeFromJson(meta["type"]),
      issuedAt: DateTime.parse(meta["issued_at"]),
      status: credentialStatusFromBool(meta["is_revoked"]),
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
        "issued_at": issuedAt.toIso8601String(),
        "is_revoked": status == CredentialStatus.revoked,
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
