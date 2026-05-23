import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/domain/models/university.dart';
import 'package:flutter/rendering.dart';

class UniversityDataSource {
  UniversityDataSource();

  final Map<String, dynamic> _universityJson = {
    "name": "Fenerbahçe University",
    "code": "FBU",
    "email": "info@fbu.edu.tr",
    "website_url": "https://www.fbu.edu.tr",
    "logo_url": "https://www.fbu.edu.tr/media/Logo/tr_white_1722936995.png",
    "phone_number": "",
  };

  Future<Student> getUniversityInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Profile - Get university info API has been called");
    return Student(
      university: University.fromJson(_universityJson),
      address: null,
      identity: null,
      department: null,
      user: null,
      academic: null,
    );
  }
}
