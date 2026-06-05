import 'package:app/feature/profile/domain/models/academic.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:dio/dio.dart';

class AcademicDataSource {
  const AcademicDataSource(this._dio);

  final Dio _dio;

  Future<Student> getAcademicInfo() async {
    final response = await _dio.get("/students/me");
    return Student(
      academic: Academic.fromJson(
        response.data["data"]["student"] as Map<String, dynamic>,
      ),
      address: null,
      identity: null,
      department: null,
      user: null,
      university: null,
    );
  }
}
