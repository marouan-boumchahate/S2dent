import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/ui/navigation/nav_item.dart';
import 'package:flutter/material.dart';

class _NavData {
  const _NavData(this.icon, this.activeIcon, this.label);
  final IconData icon;
  final IconData activeIcon;
  final String label;
}

class CustomBottomNav extends StatelessWidget {
  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    _NavData(Icons.home_outlined, Icons.home_rounded, 'Home'),
    _NavData(Icons.file_copy_outlined, Icons.file_copy, "Credentials"),
    _NavData(Icons.qr_code_2, Icons.qr_code_2_outlined, "QR"),
    _NavData(Icons.person_outline, Icons.person, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      height: 68,
      decoration: BoxDecoration(
        color: context.colors.surfaceContainer,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: context.colors.primary.withAlpha(50)),
        boxShadow: [
          BoxShadow(
            color: context.colors.primary.withAlpha(15),
            blurRadius: 24,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        children: List.generate(
          _items.length,
          (index) => NavItem(
            icon: _items[index].icon,
            activeIcon: _items[index].activeIcon,
            label: _items[index].label,
            isSelected: currentIndex == index,
            onTap: () => onTap(index),
          ),
        ),
      ),
    );
  }
}
