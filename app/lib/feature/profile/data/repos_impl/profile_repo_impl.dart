import 'package:app/feature/profile/data/datasources/academic_datasource.dart';
import 'package:app/feature/profile/data/datasources/address_datasource.dart';
import 'package:app/feature/profile/data/datasources/department_datasource.dart';
import 'package:app/feature/profile/data/datasources/identity_datasource.dart';
import 'package:app/feature/profile/data/datasources/user_datasource.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/repos/profile_repository.dart';

class ProfileRepoImpl implements ProfileRepository {
  const ProfileRepoImpl({
    required this.userDataSource,
    required this.addressDataSource,
    required this.departmentDataSource,
    required this.academicDataSource,
    required this.identityDataSource,
  });

  final UserDataSource userDataSource;
  final AddressDataSource addressDataSource;
  final DepartmentDataSource departmentDataSource;
  final AcademicDataSource academicDataSource;
  final IdentityDataSource identityDataSource;

  @override
  Future<Student> getStudentProfile() async {
    final data = await Future.wait([
      getUserInfo(),
      getAddressInfo(),
      getDepartmentInfo(),
      getAcademicInfo(),
      getIdentityInfo(),
    ]);

    return _mergeStudents(data);
  }

  @override
  Future<Student> getUserInfo() {
    return userDataSource.getUserInfo();
  }

  @override
  Future<Student> getAddressInfo() {
    return addressDataSource.getAddressInfo();
  }

  @override
  Future<Student> getDepartmentInfo() {
    return departmentDataSource.getDepartmentInfo();
  }

  @override
  Future<Student> getAcademicInfo() {
    return academicDataSource.getAcademicInfo();
  }

  @override
  Future<Student> getIdentityInfo() {
    return identityDataSource.getIdentityInfo();
  }

  @override
  Future<Student> updateStudentProfile(ProfileUpdateData data) async {
    final updateFutures = <Future<Student>>[];

    if (data.userChanged) {
      updateFutures.add(userDataSource.updateUserInfo(data));
    }
    if (data.addressChanged) {
      updateFutures.add(addressDataSource.updateAddressInfo(data));
    }

    if (updateFutures.isEmpty) {
      return const Student(
        address: null,
        identity: null,
        department: null,
        user: null,
        academic: null,
      );
    }

    final updatedData = await Future.wait(updateFutures);

    return _mergeStudents(updatedData);
  }

  Student _mergeStudents(List<Student> students) {
    Student student = const Student(
      address: null,
      identity: null,
      department: null,
      user: null,
      academic: null,
    );

    for (final item in students) {
      student = Student(
        address: item.address ?? student.address,
        identity: item.identity ?? student.identity,
        department: item.department ?? student.department,
        user: item.user ?? student.user,
        academic: item.academic ?? student.academic,
      );
    }

    return student;
  }
}
