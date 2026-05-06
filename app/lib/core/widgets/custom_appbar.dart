import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/buttons/custom_backbutton.dart';
import 'package:flutter/material.dart';

class CustomAppbar extends StatelessWidget implements PreferredSizeWidget {
  const CustomAppbar({
    super.key,
    this.trailing,
  });

  final Widget? trailing;
  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: CustomBackButton(),
      leadingWidth: 80,
      backgroundColor: context.colors.onPrimary,
      actions: [trailing ?? SizedBox()],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
