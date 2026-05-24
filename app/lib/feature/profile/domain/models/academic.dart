enum EnrollmentStatus {
  active,
  inactive,
  suspended,
  withdrawn,
  graduated,
  unknown,
}

EnrollmentStatus enrollmentStatusFromJson(Object? value) {
  if (value is EnrollmentStatus) return value;
  return EnrollmentStatus.values.firstWhere(
    (status) => status.name == value,
    //return unknown if no match found
    orElse: () => EnrollmentStatus.unknown,
  );
}

class Academic {
  const Academic({
    required this.studentNumber,
    required this.currentLevel,
    required this.enrollmentsStatus,
    required this.enrollmentDate,
    required this.expectedGraduationDate,
    required this.actualGraduationDate,
    required this.advisor,
    required this.cgpa,
  });

  final String studentNumber;
  final String currentLevel;
  final String advisor;
  final EnrollmentStatus enrollmentsStatus;
  final DateTime enrollmentDate;
  final DateTime expectedGraduationDate;
  final DateTime actualGraduationDate;
  final double cgpa;

  factory Academic.fromJson(Map<String, dynamic> json) {
    return Academic(
      studentNumber: json["student_number"] ?? "",
      currentLevel: json["current_level"] ?? "",
      advisor: json['advisor'] ?? "",
      enrollmentsStatus: enrollmentStatusFromJson(json["enrollment_status"]),
      enrollmentDate: DateTime.parse(json["enrollment_date"]),
      expectedGraduationDate: DateTime.parse(json["expected_graduation_date"]),
      actualGraduationDate: DateTime.parse(json["actual_graduation_date"]),
      cgpa: (json["cgpa"] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "student_number": studentNumber,
      "current_level": currentLevel,
      "advisor": advisor,
      "enrollment_status": enrollmentsStatus.name,
      "enrollment_date": enrollmentDate.toIso8601String(),
      "expected_graduation_date": expectedGraduationDate.toIso8601String(),
      "actual_graduation_date": actualGraduationDate.toIso8601String(),
      "cgpa": cgpa,
    };
  }
}
