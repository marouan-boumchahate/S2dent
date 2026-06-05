import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/models/user.dart';
import 'package:dio/dio.dart';

class UserDataSource {
  const UserDataSource(this._dio);

  final Dio _dio;

  Future<Student> getUserInfo() async {
    final response = await _dio.get("/users/me");
    return Student(
      user: User.fromJson(response.data["data"]["user"] as Map<String, dynamic>),
      address: null,
      identity: null,
      department: null,
      academic: null,
      university: null,
    );
  }

  Future<Student> updateUserInfo(ProfileUpdateData data) async {
    final response = await _dio.put(
      "/users",
      data: {
        if (data.phone != null) "phone": data.phone,
        if (data.photoUrl != null) "photo_url": data.photoUrl,
      },
    );
    return Student(
      user: User.fromJson(response.data["data"]["user"] as Map<String, dynamic>),
      address: null,
      identity: null,
      department: null,
      academic: null,
      university: null,
    );
  }
}
