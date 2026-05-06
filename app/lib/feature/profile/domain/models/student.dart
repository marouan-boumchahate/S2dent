import 'package:app/feature/profile/domain/models/address.dart';
import 'package:app/feature/profile/domain/models/identity.dart';
import 'package:app/feature/profile/domain/models/department.dart';
import 'package:app/feature/profile/domain/models/user.dart';
import 'package:app/feature/profile/domain/models/academic.dart';

class Student {
  const Student({
    required this.address,
    required this.identity,
    required this.department,
    required this.user,
    required this.academic,
  });

  final Address? address;
  final Identity? identity;
  final Department? department;
  final User? user;
  final Academic? academic;

  Student copyWith({
    Address? address,
    Identity? identity,
    Department? department,
    User? user,
    Academic? academic,
  }) {
    return Student(
      address: address ?? this.address,
      identity: identity ?? this.identity,
      department: department ?? this.department,
      user: user ?? this.user,
      academic: academic ?? this.academic,
    );
  }

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      address: json["address"] == null
          ? null
          : Address.fromJson(json["address"] as Map<String, dynamic>),
      identity: json["identity"] == null
          ? null
          : Identity.fromJson(json["identity"] as Map<String, dynamic>),
      department: json["department"] == null
          ? null
          : Department.fromJson(json["department"] as Map<String, dynamic>),
      user: json["user"] == null
          ? null
          : User.fromJson(json["user"] as Map<String, dynamic>),
      academic: json["academic"] == null
          ? null
          : Academic.fromJson(json["academic"] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "identity": identity?.toJson(),
      "user": user?.toJson(),
      "address": address?.toJson(),
      "department": department?.toJson(),
      "academic": academic?.toJson(),
    };
  }
}
