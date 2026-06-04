import 'package:app/feature/profile/domain/models/department.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:dio/dio.dart';

class DepartmentDataSource {
  const DepartmentDataSource(this._dio);

  final Dio _dio;

  Future<Student> getDepartmentInfo() async {
    final response = await _dio.get('/departments/me');
    return Student(
      department: Department.fromJson(
        response.data['data']['department'] as Map<String, dynamic>,
      ),
      address: null,
      identity: null,
      user: null,
      academic: null,
      university: null,
    );
  }
}
