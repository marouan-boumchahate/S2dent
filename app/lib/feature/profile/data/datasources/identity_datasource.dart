import 'package:app/feature/profile/domain/models/identity.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:dio/dio.dart';

class IdentityDataSource {
  const IdentityDataSource(this._dio);

  final Dio _dio;

  Future<Student> getIdentityInfo() async {
    final response = await _dio.get('/identity/students/me');
    return Student(
      identity: Identity.fromJson(
        response.data['data'] as Map<String, dynamic>,
      ),
      address: null,
      department: null,
      user: null,
      academic: null,
      university: null,
    );
  }
}
