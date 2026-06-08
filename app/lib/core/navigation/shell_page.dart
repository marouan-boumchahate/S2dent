import 'package:app/core/navigation/shell_page_index_provider.dart';
import 'package:app/core/widgets/ui/navigation/custom_bottom_nav.dart';
import 'package:app/feature/credentials/presentation/pages/credential.dart';
import 'package:app/feature/home/presentation/pages/home.dart';
import 'package:app/feature/profile/presentation/pages/profile.dart';
import 'package:app/feature/qr/presentation/pages/qr.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ShellPage extends ConsumerWidget {
  const ShellPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(shellPageIndexProvider);
    return Scaffold(
      //prevent the image from moving upwards
      resizeToAvoidBottomInset: false,
      body: IndexedStack(
        index: currentIndex,
        children: const [
          HomePage(),
          CredentialPage(),
          QRPage(),
          ProfilePage(),
        ],
      ),
      bottomNavigationBar: CustomBottomNav(
        currentIndex: currentIndex,
        onTap: (index) =>
            ref.read(shellPageIndexProvider.notifier).state = index,
      ),
    );
  }
}
