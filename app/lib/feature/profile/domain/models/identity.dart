class Identity {
  const Identity({
    required this.walletAddress,
    required this.issuedAt,
    required this.isRevoked,
    this.revokedAt,
  });

  final String walletAddress;
  final DateTime? issuedAt;
  final bool isRevoked;
  final DateTime? revokedAt;

  factory Identity.fromJson(Map<String, dynamic> json) {
    final status = json["status"] as Map<String, dynamic>?;
    return Identity(
      walletAddress: json["wallet_address"] ?? "",
      issuedAt: status?["issued_at"] != null
          ? DateTime.parse(status!["issued_at"])
          : null,
      isRevoked: status?["is_revoked"] ?? false,
      revokedAt: status?["revoked_at"] == null
          ? null
          : DateTime.parse(status!["revoked_at"]),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "wallet_address": walletAddress,
      "issued_at": issuedAt?.toIso8601String(),
      "is_revoked": isRevoked,
      "revoked_at": revokedAt?.toIso8601String(),
    };
  }
}
