import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/models/user.dart';

class UserDataSource {
  UserDataSource();

  Map<String, dynamic> _userJson = {
    "first_name": "Ousama",
    "middle_name": "Mohammad Khalid",
    "last_name": "Jamal Eddin",
    "date_of_birth": "2002-06-04T00:00:00.000Z",
    "gender": "male",
    "nationality": "Syrian",
    "national_id": "00000",
    "email": "ousama.eddin@stu.fbu.edu.tr",
    "phone": "+905551957963",
    "photo_url": "",
    "notes": "I love myself",
  };

  Future<Student> getUserInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return Student(
      user: User.fromJson(_userJson),
      address: null,
      identity: null,
      department: null,
      academic: null,
    );
  }

  Future<Student> updateUserInfo(ProfileUpdateData data) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final user = User.fromJson(_userJson).copyWith(
      phone: data.phone,
      email: data.email,
      photoUrl: data.photoUrl,
      notes: data.notes,
    );

    _userJson = user.toJson();
    return Student(
      user: user,
      address: null,
      identity: null,
      department: null,
      academic: null,
    );
  }
}
