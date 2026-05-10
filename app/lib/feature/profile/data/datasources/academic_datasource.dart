import 'package:app/feature/profile/domain/models/academic.dart';
import 'package:app/feature/profile/domain/models/student.dart';

class AcademicDataSource {
  AcademicDataSource();

  final Map<String, dynamic> _academicJson = {
    "student_number": "220304110",
    "current_level": "Year 4",
    "enrollment_status": "active",
    "enrollment_date": "2022-09-19T00:00:00.000Z",
    "expected_graduation_date": "2026-06-30T00:00:00.000Z",
    "actual_graduation_date": "2026-06-30T00:00:00.000Z",
    "cgpa": 3.75,
  };

  Future<Student> getAcademicInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return Student(
      academic: Academic.fromJson(_academicJson),
      address: null,
      identity: null,
      department: null,
      user: null,
    );
  }
}
