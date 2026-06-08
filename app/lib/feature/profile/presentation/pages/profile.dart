import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/auth/presentation/providers/auth_provider.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/pages/edit_address_info.dart';
import 'package:app/feature/profile/presentation/pages/edit_personal_info.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/academic_section.dart';
import 'package:app/feature/profile/presentation/widgets/address_section.dart';
import 'package:app/feature/profile/presentation/widgets/header_section.dart';
import 'package:app/feature/profile/presentation/widgets/settings_section.dart';
import 'package:app/feature/profile/presentation/widgets/user_section.dart';
import 'package:app/core/services/token_storage_services.dart';
import 'package:app/core/utils/show_logout_dialog.dart';
import 'package:app/feature/settings/presentation/pages/settings.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
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

  void onTapLogout() {
    showLogoutDialog(context, onConfirm: () async {
      await ref.read(authControllerProvider.notifier).logout();
    });
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
              onTapLogout: onTapLogout,
            ),
            if (kDebugMode)
              TextButton.icon(
                onPressed: () async {
                  final storage = ref.read(tokenStorageServiceProvider);
                  final messenger = ScaffoldMessenger.of(context);
                  await storage.saveTokens('corrupted_access', 'corrupted_refresh');
                  messenger.showSnackBar(const SnackBar(
                    content: Text('[DEBUG] Both tokens corrupted — make any API call to trigger expiry'),
                  ));
                },
                icon: const Icon(Icons.bug_report, color: Colors.red),
                label: const Text('Simulate session expiry',
                    style: TextStyle(color: Colors.red)),
              ),
          ],
        ),
      ),
      error: (error, stackTrace) => Center(
        child: Text("ERROR OCCURED"),
      ),
      loading: () => LoadingState(),
    );
  }
}
