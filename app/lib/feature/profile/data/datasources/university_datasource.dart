import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/models/university.dart';
import 'package:dio/dio.dart';

class UniversityDataSource {
  const UniversityDataSource(this._dio);

  final Dio _dio;

  Future<Student> getUniversityInfo() async {
    final response = await _dio.get("/academies/summary");
    return Student(
      university: University.fromJson(
        response.data["data"] as Map<String, dynamic>,
      ),
      address: null,
      identity: null,
      department: null,
      user: null,
      academic: null,
    );
  }
}
