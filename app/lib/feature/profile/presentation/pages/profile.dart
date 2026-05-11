import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/pages/edit_address_info.dart';
import 'package:app/feature/profile/presentation/pages/edit_personal_info.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/academic_section.dart';
import 'package:app/feature/profile/presentation/widgets/address_section.dart';
import 'package:app/feature/profile/presentation/widgets/header_section.dart';
import 'package:app/feature/profile/presentation/widgets/settings_section.dart';
import 'package:app/feature/profile/presentation/widgets/user_section.dart';
import 'package:app/feature/settings/presentation/pages/settings.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(profileControllerProvider.notifier).loadFullProfile();
    });
  }

  void onTapEditUserInfo(Student student) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => EditPersonalInfoPage(
          student: student,
        ),
      ),
    );
  }

  void onTapEditAddressInfo(Student student) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => EditAddressInfoPage(
          student: student,
        ),
      ),
    );
  }

  void onTapSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => SettingsPage(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final studentData = ref.watch(profileControllerProvider);
    return studentData.when(
      data: (student) => RefreshIndicator(
        onRefresh: () =>
            ref.read(profileControllerProvider.notifier).loadFullProfile(),
        child: MainLayout(
          children: [
            const SizedBox(height: 32),
            HeaderSection(student: student),
            UserSection(
                onTap: () => onTapEditUserInfo(student), student: student),
            AcademicSection(student: student),
            AddressSection(
              onTap: () => onTapEditAddressInfo(student),
              student: student,
            ),
            SettingsSection(
              onTapSettings: onTapSettings,
            ),
          ],
        ),
      ),
      error: (error, stackTrace) => Center(
        child: Text("ERROR OCCURED"),
      ),
      loading: () => Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
