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

CredentialStatus credentialStatusFromJson(Object? value) {
  if (value is CredentialStatus) return value;
  return CredentialStatus.values.firstWhere(
    (element) => element.name == value,
    orElse: () => CredentialStatus.unknown,
  );
}

class Credential {
  const Credential({
    required this.id,
    required this.title,
    required this.type,
    required this.issuerName,
    required this.issuedTo,
    required this.issuedAt,
    this.expiresAt,
    required this.status,
    required this.transactionHash,
    this.description,
  });

  final String id;
  final String title;
  final CredentialType type;
  final String issuerName;
  final String issuedTo;
  final DateTime issuedAt;
  final DateTime? expiresAt;
  final CredentialStatus status;
  final String transactionHash;
  final String? description;

  factory Credential.fromJson(Map<String, dynamic> json) {
    return Credential(
      id: json["id"] ?? "",
      title: json["title"] ?? "",
      type: credentialTypeFromJson(json["type"]),
      issuerName: json["issuer_name"] ?? "",
      issuedTo: json["issued_to"] ?? "",
      issuedAt: DateTime.parse(json["issued_at"]),
      expiresAt: json["expires_at"] != null
          ? DateTime.parse(json["expires_at"])
          : null,
      status: credentialStatusFromJson(json["status"]),
      transactionHash: json["transaction_hash"] ?? "",
      description: json["description"],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "title": title,
      "type": type.name,
      "issuer_name": issuerName,
      "issued_to": issuedTo,
      "issued_at": issuedAt.toIso8601String(),
      "expires_at": expiresAt?.toIso8601String(),
      "status": status.name,
      "transaction_hash": transactionHash,
      "description": description,
    };
  }
}
