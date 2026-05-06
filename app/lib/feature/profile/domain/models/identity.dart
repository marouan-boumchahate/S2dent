class Identity {
  const Identity({
    required this.walletAddress,
    required this.identityTxHash,
    required this.issuedAt,
    required this.isRevoked,
    this.revokedAt,
  });

  final String walletAddress;
  final String identityTxHash;
  final DateTime issuedAt;
  final bool isRevoked;
  final DateTime? revokedAt;

  factory Identity.fromJson(Map<String, dynamic> json) {
    return Identity(
      walletAddress: json["wallet_address"] ?? "",
      identityTxHash: json["identity_tx_hash"] ?? "",
      issuedAt: DateTime.parse(json["issued_at"]),
      isRevoked: json["is_revoked"] ?? true,
      revokedAt: json["revoked_at"] == null
          ? null
          : DateTime.parse(json["revoked_at"]),
    );
  }

  factory Identity.fromJason(Map<String, dynamic> json) =>
      Identity.fromJson(json);

  Map<String, dynamic> toJson() {
    return {
      "wallet_address": walletAddress,
      "identity_tx_hash": identityTxHash,
      "issued_at": issuedAt.toIso8601String(),
      "is_revoked": isRevoked,
      "revoked_at": revokedAt?.toIso8601String(),
    };
  }
}
