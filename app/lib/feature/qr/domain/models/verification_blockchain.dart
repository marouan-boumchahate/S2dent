class VerificationBlockchain {
  const VerificationBlockchain({
    required this.issueTxHash,
    required this.revokeTxHash,
    required this.credentialIndex,
    required this.academyAddress,
    required this.issuerAddress,
    required this.revocationReason,
  });

  final String issueTxHash;
  final String? revokeTxHash;
  final String? revocationReason;
  final int credentialIndex;
  final String academyAddress;
  final String issuerAddress;

  factory VerificationBlockchain.fromJson(Map<String, dynamic> json) {
    return VerificationBlockchain(
      issueTxHash: json["issue_tx_hash"] ?? "",
      revokeTxHash: json["revoke_tx_hash"],
      revocationReason: json["revocation_reason"],
      credentialIndex: json["credential_index"] ?? 0,
      academyAddress: json["academy_address"] ?? "",
      issuerAddress: json["issuer_address"] ?? "",
    );
  }
}
