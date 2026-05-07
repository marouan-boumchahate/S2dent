import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:app/core/widgets/ui/info_tile.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/models/user.dart';
import 'package:app/feature/profile/presentation/widgets/custom_text_button.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:app/core/utils/date_formatter.dart';

class UserSection extends StatelessWidget {
  const UserSection({
    super.key,
    required this.onTap,
    required this.student,
  });

  final void Function() onTap;
  final Student student;
  @override
  Widget build(BuildContext context) {
    final user = student.user;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Personal Info",
        editButton: CustomTextButton(
          label: "EDIT",
          color: context.colors.primary,
          onTap: onTap,
        ),
        widgets: [
          InfoTile(
            label: "Email",
            trailing: Text(user?.email ?? ""),
            icon: Icons.email_outlined,
          ),
          InfoTile(
            label: "Phone Number",
            trailing: Text(student.user?.phone ?? ""),
            icon: Icons.phone,
          ),
          InfoTile(
            label: "Date of Birth",
            trailing: Text(dateFormatter(user?.dateOfBirth)),
            icon: Icons.date_range_outlined,
          ),
          InfoTile(
            label: "Nationality",
            trailing: Text(user?.nationalId ?? ""),
            icon: Icons.trip_origin,
          ),
          InfoTile(
            label: "Gender",
            trailing: Text(user?.gender.name.capitalize ?? ""),
            icon: user?.gender == Gender.male ? Icons.male : Icons.female,
          )
        ],
      ),
    );
  }
}
