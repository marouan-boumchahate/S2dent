enum CredentialItemType {
  degree,
  certificate,
  transcript,
  enrollment,
  achievement,
  attendance,
  unknown,
}

CredentialItemType credentialItemTypeFromJson(String value) {
  try {
    return CredentialItemType.values.byName(value);
  } catch (e) {
    return CredentialItemType.unknown;
  }
}

//i removed status (we dont need it in frontend)
class CredentialItem {
  const CredentialItem({
    required this.id,
    required this.title,
    required this.code,
    required this.type,
    required this.studentName,
    required this.issuedAt,
    required this.isRevoked,
  });

  final String id;
  final String title;
  final String code;
  final CredentialItemType type;
  final String studentName;
  final DateTime? issuedAt;
  final bool isRevoked;

  factory CredentialItem.fromJson(Map<String, dynamic> json) {
    return CredentialItem(
      id: json["id"] ?? "",
      title: json["title"] ?? "",
      code: json["code"] ?? "",
      type: credentialItemTypeFromJson(json["type"] ?? ""),
      studentName: json["student_name"] ?? "",
      issuedAt: json["issued_at"] != null
          ? DateTime.parse(json["issued_at"])
          : null,
      isRevoked: json["is_revoked"] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "title": title,
      "code": code,
      "type": type.name,
      "student_name": studentName,
      "issued_at": issuedAt?.toIso8601String(),
      "is_revoked": isRevoked,
    };
  }
}
