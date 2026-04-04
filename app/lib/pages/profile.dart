import 'package:app/components/buttons/custom_text_button.dart';
import 'package:app/components/buttons/pressable_profile_tile.dart';
import 'package:app/components/info_badge.dart';
import 'package:app/components/profile/profile_tile.dart';
import 'package:app/components/layouts/main_layout.dart';
import 'package:app/components/profile/profile_section.dart';
import 'package:app/extensions/context_extensions.dart';
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
    debugPrint("navigating to account settings");
  }

  void onTapContactUs() {
    debugPrint("on tap contact us");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      appBar: AppBar(
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
      child: ProfileSection(
        title: "Personal Info",
        editButton: CustomTextButton(
          label: "EDIT",
          color: context.colors.primary,
          onTap: onTapEdit,
        ),
        widgets: [
          ProfileTile(
            title: "Phone Number",
            trailing: Text("+905551957963"),
            icon: Icons.phone,
          ),
          ProfileTile(
            title: "Date of Birth",
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
      child: ProfileSection(
        title: "Academic Info",
        widgets: [
          ProfileTile(
            title: "University",
            trailing: Text("Fenerbahce"),
            icon: Icons.apartment,
          ),
          ProfileTile(
            title: "Department",
            trailing: Text("Computer Engineering"),
            icon: Icons.trip_origin,
          ),
          ProfileTile(
            title: "Student ID",
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
      child: ProfileSection(
        title: "Settings",
        widgets: [
          PressableProfileTile(
            label: "Account Settings",
            onTap: onTapSettings,
            icon: Icons.settings,
          ),
          PressableProfileTile(
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
