import 'package:app/core/widgets/ui/navigation/custom_bottom_nav.dart';
import 'package:app/feature/credentials/presentation/pages/credential.dart';
import 'package:app/feature/home/presentation/pages/home.dart';
import 'package:app/feature/profile/presentation/pages/profile.dart';
import 'package:flutter/material.dart';

class ShellPage extends StatefulWidget {
  const ShellPage({super.key});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  int _currentIndex = 0;
  final List<Widget> _tabs = [
    HomePage(),
    ProfilePage(),
    CredentialPage(),
  ];
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: CustomBottomNav(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}
