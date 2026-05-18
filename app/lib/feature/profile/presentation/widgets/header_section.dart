import 'dart:io';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/widgets/info_badge.dart';
import 'package:flutter/material.dart';

class HeaderSection extends StatelessWidget {
  const HeaderSection({
    super.key,
    required this.student,
  });

  final Student student;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _userAvatar(context, student),
        Text(
          student.user?.fullName() ?? "",
          style: context.texts.headlineSmall,
          textAlign: TextAlign.center,
        ),
        _infoBadges(context, student),
      ],
    );
  }

  Padding _infoBadges(BuildContext context, Student student) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          InfoBadge(
            info: (student.identity?.isRevoked ?? true) ? "Inactive" : "Active",
            color: (student.identity?.isRevoked ?? true)
                ? context.colors.error
                : context.colors.primary,
          ),
          InfoBadge(
              info: student.academic?.currentLevel ?? "",
              color: context.colors.secondary),
          InfoBadge(
              info: student.department?.code ?? "",
              color: context.colors.tertiary),
        ],
      ),
    );
  }

  Card _userAvatar(BuildContext context, Student student) {
    final user = student.user;
    final image = _profileImage(user?.photoUrl ?? "");

    return Card(
      shape: CircleBorder(
        side: BorderSide(color: context.colors.primary, width: 4),
      ),
      elevation: 4,
      child: CircleAvatar(
        radius: 60,
        backgroundColor: context.colors.surfaceContainer,
        backgroundImage: image,
        child: image == null
            ? Text(
                _initials(student),
                style: context.texts.headlineSmall!.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              )
            : null,
      ),
    );
  }

  ImageProvider? _profileImage(String photoUrl) {
    final value = photoUrl.trim();
    if (value.isEmpty) return null;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return NetworkImage(value);
    }
    return FileImage(File(value));
  }

  String _initials(Student student) {
    final user = student.user;
    if (user == null) return "";

    final firstInitial = user.firstName.isEmpty ? "" : user.firstName[0];
    final lastInitial = user.lastName.isEmpty ? "" : user.lastName[0];
    return "$firstInitial$lastInitial";
  }
}
