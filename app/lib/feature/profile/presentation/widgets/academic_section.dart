import 'package:app/core/utils/date_formatter.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:app/core/widgets/ui/info_tile.dart';
import 'package:app/feature/profile/domain/models/academic.dart';
import 'package:app/feature/profile/domain/models/department.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:flutter/material.dart';

class AcademicSection extends StatelessWidget {
  const AcademicSection({
    super.key,
    required this.student,
  });
  final Student student;

  @override
  Widget build(BuildContext context) {
    final Department? department = student.department;
    final Academic? academic = student.academic;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Academic Info",
        widgets: [
          InfoTile(
            label: "University",
            //TODO: fetch the name
            trailing: Text("Fenerbahce"),
            icon: Icons.apartment,
          ),
          InfoTile(
            label: "Department",
            trailing: Text(department?.name ?? ""),
            icon: Icons.home_work_outlined,
          ),
          InfoTile(
            label: "Student ID",
            trailing: Text(academic?.studentNumber ?? ""),
            icon: Icons.crop_landscape_outlined,
          ),
          InfoTile(
            label: "Expected Graduation",
            trailing: Text(
              dateFormatter(academic?.expectedGraduationDate),
            ),
            icon: Icons.school_outlined,
          )
        ],
      ),
    );
  }
}
