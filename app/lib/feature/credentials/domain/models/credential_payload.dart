class EnrollmentPayload {
  const EnrollmentPayload({
    required this.courseName,
    required this.courseCode,
    required this.academicYear,
    required this.semester,
    required this.enrollmentDate,
  });

  final String courseName;
  final String courseCode;
  final String academicYear;
  final String semester;
  final DateTime? enrollmentDate;

  factory EnrollmentPayload.fromJson(Map<String, dynamic> json) {
    return EnrollmentPayload(
      courseName: json["course_name"] ?? "",
      courseCode: json["course_code"] ?? "",
      academicYear: json["academic_year"] ?? "",
      semester: json["semester"] ?? "",
      enrollmentDate: json["enrollment_date"] != null
          ? DateTime.parse(json["enrollment_date"])
          : null,
    );
  }
}

class AttendancePayload {
  const AttendancePayload({
    required this.courseCode,
    required this.courseName,
    required this.academicYear,
    required this.semester,
    required this.totalSessions,
    required this.attendedSessions,
    required this.excusedAbsences,
    required this.periodFrom,
    required this.periodTo,
  });

  final String courseCode;
  final String courseName;
  final String academicYear;
  final String semester;
  final int totalSessions;
  final int attendedSessions;
  final int excusedAbsences;
  final DateTime? periodFrom;
  final DateTime? periodTo;

  factory AttendancePayload.fromJson(Map<String, dynamic> json) {
    return AttendancePayload(
      courseCode: json["course_code"] ?? "",
      courseName: json["course_name"] ?? "",
      academicYear: json["academic_year"] ?? "",
      semester: json["semester"] ?? "",
      totalSessions: json["total_sessions"] ?? 0,
      attendedSessions: json["attended_sessions"] ?? 0,
      excusedAbsences: json["excused_absences"] ?? 0,
      periodFrom: json["period_from"] != null
          ? DateTime.parse(json["period_from"])
          : null,
      periodTo:
          json["period_to"] != null ? DateTime.parse(json["period_to"]) : null,
    );
  }
}

class DegreePayload {
  const DegreePayload({
    required this.degreeTitle,
    required this.degreeLevel,
    required this.major,
    required this.programCode,
    required this.faculty,
    required this.department,
    required this.graduationDate,
    required this.gpa,
    required this.gpaScale,
    required this.classRank,
    required this.classSize,
    required this.honors,
    required this.totalCreditsEarned,
    required this.requiredCredits,
  });

  final String degreeTitle;
  final String degreeLevel;
  final String major;
  final String programCode;
  final String faculty;
  final String department;
  final DateTime? graduationDate;
  final num gpa;
  final num gpaScale;
  final int classRank;
  final int classSize;
  final String? honors;
  final int totalCreditsEarned;
  final int requiredCredits;

  factory DegreePayload.fromJson(Map<String, dynamic> json) {
    return DegreePayload(
      degreeTitle: json["degree_title"] ?? "",
      degreeLevel: json["degree_level"] ?? "",
      major: json["major"] ?? "",
      programCode: json["program_code"] ?? "",
      faculty: json["faculty"] ?? "",
      department: json["department"] ?? "",
      graduationDate: json["graduation_date"] != null
          ? DateTime.parse(json["graduation_date"])
          : null,
      gpa: json["gpa"] ?? 0,
      gpaScale: json["gpa_scale"] ?? 0,
      classRank: json["class_rank"] ?? 0,
      classSize: json["class_size"] ?? 0,
      honors: json["honors"],
      totalCreditsEarned: json["total_credits_earned"] ?? 0,
      requiredCredits: json["required_credits"] ?? 0,
    );
  }
}

class CertificatePayload {
  const CertificatePayload({
    required this.certificateName,
    required this.certificateCode,
    required this.certificateCategory,
    required this.programDurationHours,
    required this.deliveryMode,
    required this.startDate,
    required this.endDate,
    required this.finalScore,
    required this.passingScore,
    required this.instructorName,
  });

  final String certificateName;
  final String certificateCode;
  final String certificateCategory;
  final int programDurationHours;
  final String deliveryMode;
  final DateTime? startDate;
  final DateTime? endDate;
  final num finalScore;
  final num passingScore;
  final String instructorName;

  factory CertificatePayload.fromJson(Map<String, dynamic> json) {
    return CertificatePayload(
      certificateName: json["certificate_name"] ?? "",
      certificateCode: json["certificate_code"] ?? "",
      certificateCategory: json["certificate_category"] ?? "",
      programDurationHours: json["program_duration_hours"] ?? 0,
      deliveryMode: json["delivery_mode"] ?? "",
      startDate: json["start_date"] != null
          ? DateTime.parse(json["start_date"])
          : null,
      endDate:
          json["end_date"] != null ? DateTime.parse(json["end_date"]) : null,
      finalScore: json["final_score"] ?? 0,
      passingScore: json["passing_score"] ?? 0,
      instructorName: json["instructor_name"] ?? "",
    );
  }
}

class AchievementPayload {
  const AchievementPayload({
    required this.achievementTitle,
    required this.achievementType,
    required this.eventName,
    required this.eventType,
    required this.eventOrganizer,
    required this.eventDate,
    required this.eventLocation,
    required this.score,
    required this.placement,
    required this.teamName,
    required this.projectTitle,
    required this.projectDescription,
  });

  final String achievementTitle;
  final String achievementType;
  final String eventName;
  final String eventType;
  final String eventOrganizer;
  final DateTime? eventDate;
  final String eventLocation;
  final num? score;
  final String? placement;
  final String? teamName;
  final String? projectTitle;
  final String? projectDescription;

  factory AchievementPayload.fromJson(Map<String, dynamic> json) {
    return AchievementPayload(
      achievementTitle: json["achievement_title"] ?? "",
      achievementType: json["achievement_type"] ?? "",
      eventName: json["event_name"] ?? "",
      eventType: json["event_type"] ?? "",
      eventOrganizer: json["event_organizer"] ?? "",
      eventDate: json["event_date"] != null
          ? DateTime.parse(json["event_date"])
          : null,
      eventLocation: json["event_location"] ?? "",
      score: json["score"],
      placement: json["placement"],
      teamName: json["team_name"],
      projectTitle: json["project_title"],
      projectDescription: json["project_description"],
    );
  }
}

class TranscriptPayload {
  const TranscriptPayload({
    required this.academicYearFrom,
    required this.academicYearTo,
    required this.programName,
    required this.degreeLevel,
    required this.cumulativeGpa,
    required this.gpaScale,
    required this.totalCreditsAttempted,
    required this.totalCreditsEarned,
  });

  final String academicYearFrom;
  final String academicYearTo;
  final String programName;
  final String degreeLevel;
  final num cumulativeGpa;
  final num gpaScale;
  final int totalCreditsAttempted;
  final int totalCreditsEarned;

  factory TranscriptPayload.fromJson(Map<String, dynamic> json) {
    return TranscriptPayload(
      academicYearFrom: json["academic_year_from"] ?? "",
      academicYearTo: json["academic_year_to"] ?? "",
      programName: json["program_name"] ?? "",
      degreeLevel: json["degree_level"] ?? "",
      cumulativeGpa: json["cumulative_gpa"] ?? 0,
      gpaScale: json["gpa_scale"] ?? 0,
      totalCreditsAttempted: json["total_credits_attempted"] ?? 0,
      totalCreditsEarned: json["total_credits_earned"] ?? 0,
    );
  }
}
