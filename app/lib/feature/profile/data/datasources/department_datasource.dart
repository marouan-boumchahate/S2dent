import 'package:app/feature/profile/domain/models/department.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:flutter/rendering.dart';

class DepartmentDataSource {
  DepartmentDataSource();

  final Map<String, dynamic> _departmentJson = {
    "name": "Computer Engineering",
    "code": "CE",
    "faculty": "Engineering and Architecture",
  };

  Future<Student> getDepartmentInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Profile - Get department info API has been called");
    return Student(
      department: Department.fromJson(_departmentJson),
      address: null,
      identity: null,
      user: null,
      academic: null,
    );
  }
}
