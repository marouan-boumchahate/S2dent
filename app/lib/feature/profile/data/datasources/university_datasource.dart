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
    "logo_url":
        "https://upload.wikimedia.org/wikipedia/tr/7/72/Fenerbah%C3%A7e_%C3%9Cniversitesi_FB%C3%9C.png",
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
