class VerificationStudent {
  const VerificationStudent({
    required this.studentAddress,
    required this.studentName,
  });

  final String studentAddress;
  final String studentName;

  factory VerificationStudent.fromJson(Map<String, dynamic> json) {
    return VerificationStudent(
      studentAddress: json["address"] ?? "",
      studentName: json["name"] ?? "",
    );
  }
}
