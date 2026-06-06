class Verification {
  const Verification({
    required this.payloadHash,
    required this.issuerSignature,
    required this.studentSignature,
  });

  final String payloadHash;
  final String issuerSignature;
  final String studentSignature;

  factory Verification.fromJson(Map<String, dynamic> json) {
    return Verification(
      payloadHash: json["payload_hash"] ?? "",
      issuerSignature: json["issuer_signature"] ?? "",
      studentSignature: json["student_signature"] ?? "",
    );
  }
}
