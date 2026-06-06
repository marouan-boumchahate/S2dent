import 'package:app/feature/credentials/domain/models/credential_item.dart';

CredentialItemType credentialItemTypeFromJson(String value) {
  try {
    return CredentialItemType.values.byName(value);
  } catch (e) {
    return CredentialItemType.unknown;
  }
}

class VerificationMeta {
  const VerificationMeta({
    required this.id,
    required this.title,
    required this.code,
    required this.type,
    required this.description,
    required this.locale,
    required this.issuedAt,
    required this.isRevoked,
  });

  final String id;
  final String title;
  final String code;
  final CredentialItemType type;
  final String description;
  final String locale;
  final DateTime issuedAt;
  final bool isRevoked;

  factory VerificationMeta.fromJson(Map<String, dynamic> json) {
    return VerificationMeta(
      id: json["id"] ?? "",
      title: json["title"] ?? "",
      code: json["code"] ?? "",
      type: credentialItemTypeFromJson(json["type"] ?? ""),
      description: json["description"] ?? "",
      locale: json["locale"] ?? "",
      issuedAt: DateTime.parse(json["issued_at"]),
      isRevoked: json["is_revoked"] ?? false,
    );
  }
}
