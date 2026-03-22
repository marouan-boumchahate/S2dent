import 'package:app/pages/login.dart';
import 'package:app/providers/appkit_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});
  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final _secureStorage = FlutterSecureStorage();

  Future<void> signOut() async {
    final appKitModal = ref.read(appKitModalProvider);
    if (appKitModal != null) {
      await appKitModal.disconnect();
      await _secureStorage.deleteAll();
      ref.read(appKitModalProvider.notifier).state = null;
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const LoginPage(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () {
            signOut();
          },
          icon: Icon(Icons.logout_outlined),
        ),
      ),
      body: Center(
        child: Text("HELLOOO"),
      ),
    );
  }
}
