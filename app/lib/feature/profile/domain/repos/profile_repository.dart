import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';

abstract class ProfileRepository {
  Future<Student> getStudentProfile();
  Future<Student> getUserInfo();
  Future<Student> getAddressInfo();
  Future<Student> getDepartmentInfo();
  Future<Student> getAcademicInfo();
  Future<Student> getIdentityInfo();
  Future<Student> updateStudentProfile(ProfileUpdateData data);
}
