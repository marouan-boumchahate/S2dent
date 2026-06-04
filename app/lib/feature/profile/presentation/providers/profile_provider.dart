import 'package:app/core/network/api_client.dart';
import 'package:app/feature/profile/data/datasources/academic_datasource.dart';
import 'package:app/feature/profile/data/datasources/address_datasource.dart';
import 'package:app/feature/profile/data/datasources/department_datasource.dart';
import 'package:app/feature/profile/data/datasources/identity_datasource.dart';
import 'package:app/feature/profile/data/datasources/university_datasource.dart';
import 'package:app/feature/profile/data/datasources/user_datasource.dart';
import 'package:app/feature/profile/data/repos_impl/profile_repo_impl.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/repos/profile_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

class ProfileController extends StateNotifier<AsyncValue<Student>> {
  ProfileController(this.repository) : super(const AsyncValue.loading()) {
    loadFullProfile();
  }

  final ProfileRepository repository;

  Future<Student?> loadUserInfo() async {
    return _loadSection(repository.getUserInfo);
  }

  Future<Student?> loadAddressInfo() async {
    return _loadSection(repository.getAddressInfo);
  }

  Future<Student?> loadDepartmentInfo() async {
    return _loadSection(repository.getDepartmentInfo);
  }

  Future<Student?> loadAcademicInfo() async {
    return _loadSection(repository.getAcademicInfo);
  }

  Future<Student?> loadIdentityInfo() async {
    return _loadSection(repository.getIdentityInfo);
  }

  Future<Student?> loadUniversityInfo() async {
    return _loadSection(repository.getUniversityInfo);
  }

  Future<void> loadFullProfile() async {
    state = const AsyncValue.loading();

    try {
      //results is now a list of Student
      // "all wait operations happen in parallel"
      final results = await Future.wait([
        repository.getUserInfo(),
        repository.getAddressInfo(),
        repository.getDepartmentInfo(),
        repository.getAcademicInfo(),
        repository.getIdentityInfo(),
        repository.getUniversityInfo(),
      ]);

      Student merged = const Student(
        address: null,
        identity: null,
        department: null,
        user: null,
        academic: null,
        university: null,
      );
      //merge the list elements into 1 Student
      for (final student in results) {
        merged = _mergeStudent(student, merged);
      }

      state = AsyncValue.data(merged);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<Student?> _loadSection(Future<Student> Function() fetch) async {
    final previousStudent = state.whenOrNull(data: (student) => student);

    state = const AsyncValue.loading();
    try {
      final student = await fetch();
      //each time we load a single section, combine it with the previous loaded one
      final mergedStudent = _mergeStudent(student, previousStudent);

      state = AsyncValue.data(mergedStudent);
      return mergedStudent;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      return null;
    }
  }

  Future<bool> updateProfile(ProfileUpdateData data) async {
    final validationError = data.validate();
    if (validationError != null) {
      state = AsyncValue.error(validationError, StackTrace.current);
      return false;
    }

    final previousStudent = state.whenOrNull(data: (student) => student);
    state = const AsyncValue.loading();
    try {
      final student = await repository.updateStudentProfile(data);
      state = AsyncValue.data(_mergeStudent(student, previousStudent));
      return true;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      return false;
    }
  }

  Student _mergeStudent(Student student, Student? previousStudent) {
    if (previousStudent == null) return student;

    return Student(
      address: student.address ?? previousStudent.address,
      identity: student.identity ?? previousStudent.identity,
      department: student.department ?? previousStudent.department,
      user: student.user ?? previousStudent.user,
      academic: student.academic ?? previousStudent.academic,
      university: student.university ?? previousStudent.university,
    );
  }
}

final userDataSourceProvider = Provider<UserDataSource>(
  (ref) => UserDataSource(ref.watch(dioProvider)),
);

final addressDataSourceProvider = Provider<AddressDataSource>(
  (ref) => AddressDataSource(ref.watch(dioProvider)),
);

final departmentDataSourceProvider = Provider<DepartmentDataSource>(
  (ref) => DepartmentDataSource(ref.watch(dioProvider)),
);

final academicDataSourceProvider = Provider<AcademicDataSource>(
  (ref) => AcademicDataSource(ref.watch(dioProvider)),
);

final identityDataSourceProvider = Provider<IdentityDataSource>(
  (ref) => IdentityDataSource(ref.watch(dioProvider)),
);

final universityDataSourceProvider = Provider<UniversityDataSource>(
  (ref) => UniversityDataSource(ref.watch(dioProvider)),
);

final profileRepositoryProvider = Provider<ProfileRepository>(
  (ref) => ProfileRepoImpl(
    userDataSource: ref.watch(userDataSourceProvider),
    addressDataSource: ref.watch(addressDataSourceProvider),
    departmentDataSource: ref.watch(departmentDataSourceProvider),
    academicDataSource: ref.watch(academicDataSourceProvider),
    identityDataSource: ref.watch(identityDataSourceProvider),
    universityDataSource: ref.watch(universityDataSourceProvider),
  ),
);

final profileEditModeProvider = StateProvider<bool>((ref) => false);

final profileControllerProvider =
    StateNotifierProvider<ProfileController, AsyncValue<Student>>(
  (ref) => ProfileController(ref.watch(profileRepositoryProvider)),
);
