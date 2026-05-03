import 'package:app/core/widgets/buttons/custom_backbutton.dart';
import 'package:app/core/widgets/buttons/pressable_info_tile.dart';
import 'package:app/core/widgets/info_section.dart';
import 'package:app/core/widgets/info_tile.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/presentation/widgets/custom_text_button.dart';
import 'package:app/feature/profile/presentation/widgets/info_badge.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/settings/presentation/pages/settings.dart';
import 'package:flutter/material.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final Map<String, String> dummyData = {
    "name": "Ousama",
    "surname": "Jamal Eddin",
    "fullname": "Ousama Jamal Eddin",
    "university": "Fenerbahce University",
    "department": "Computer Engineering",
    "year": "Year 4",
    "gpa": "4.0",
  };

  void onTapEdit() {
    debugPrint("edit button has been tapped");
  }

  void onTapSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => SettingsPage(),
      ),
    );
  }

  void onTapContactUs() {
    debugPrint("on tap contact us");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      appBar: AppBar(
        leading: CustomBackButton(),
        leadingWidth: 80,
        backgroundColor: context.colors.onPrimary,
      ),
      body: MainLayout(
        topSafeArea: false,
        children: [
          _header(context),
          _personalInfo(),
          _academicInfo(),
          _settings(),
        ],
      ),
    );
  }

  Column _header(BuildContext context) {
    return Column(
      children: [
        _userAvatar(context),
        Text(
          dummyData["fullname"]!,
          style: TextStyle(fontSize: 24),
          textAlign: TextAlign.center,
        ),
        _infoBadges(context),
      ],
    );
  }

  Padding _personalInfo() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Personal Info",
        editButton: CustomTextButton(
          label: "EDIT",
          color: context.colors.primary,
          onTap: onTapEdit,
        ),
        widgets: [
          InfoTile(
            label: "Phone Number",
            trailing: Text("+905551957963"),
            icon: Icons.phone,
          ),
          InfoTile(
            label: "Date of Birth",
            trailing: Text("04/06/2002"),
            icon: Icons.date_range_outlined,
          ),
        ],
      ),
    );
  }

  Padding _academicInfo() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Academic Info",
        widgets: [
          InfoTile(
            label: "University",
            trailing: Text("Fenerbahce"),
            icon: Icons.apartment,
          ),
          InfoTile(
            label: "Department",
            trailing: Text("Computer Engineering"),
            icon: Icons.trip_origin,
          ),
          InfoTile(
            label: "Student ID",
            trailing: Text("220304110"),
            icon: Icons.crop_landscape_outlined,
          ),
        ],
      ),
    );
  }

  Padding _settings() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Settings",
        widgets: [
          PressableInfoTile(
            label: "Account Settings",
            onTap: onTapSettings,
            icon: Icons.settings,
          ),
          PressableInfoTile(
            label: "Contact Us",
            onTap: onTapContactUs,
            icon: Icons.contact_support_outlined,
          )
        ],
      ),
    );
  }

  Padding _infoBadges(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          InfoBadge(info: "Verified", color: context.colors.primary),
          InfoBadge(info: "Year 4", color: context.colors.secondary),
          InfoBadge(info: "CE", color: context.colors.tertiary),
        ],
      ),
    );
  }

  Card _userAvatar(BuildContext context) {
    return Card(
      shape: CircleBorder(
        side: BorderSide(color: context.colors.primary, width: 4),
      ),
      elevation: 4,
      child: CircleAvatar(
        radius: 60,
        backgroundColor: context.colors.surfaceContainer,
        child: Text(
          dummyData["name"]![0] + dummyData["surname"]![0],
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
