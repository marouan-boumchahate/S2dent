enum Gender {
  male,
  female,
}

Gender genderFromJson(Object? value) {
  if (value is Gender) return value;
  return Gender.values.firstWhere(
    (gender) => gender.name == value,
    orElse: () => Gender.male,
  );
}

class User {
  const User({
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.dateOfBirth,
    required this.gender,
    required this.nationality,
    required this.nationalId,
    required this.email,
    required this.phone,
    required this.photoUrl,
    required this.notes,
  });

  final String firstName;
  final String middleName;
  final String lastName;
  final DateTime dateOfBirth;
  final Gender gender;
  final String nationality;
  final String nationalId;
  final String email;
  final String phone;
  final String photoUrl;
  final String notes;

  String fullName() => "$firstName $middleName $lastName";

  //update only changed values
  User copyWith({
    String? firstName,
    String? middleName,
    String? lastName,
    DateTime? dateOfBirth,
    Gender? gender,
    String? nationality,
    String? nationalId,
    String? email,
    String? phone,
    String? photoUrl,
    String? notes,
  }) {
    return User(
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      nationality: nationality ?? this.nationality,
      nationalId: nationalId ?? this.nationalId,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      photoUrl: photoUrl ?? this.photoUrl,
      notes: notes ?? this.notes,
    );
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      firstName: json["first_name"] ?? "",
      middleName: json["middle_name"] ?? "",
      lastName: json["last_name"] ?? "",
      dateOfBirth: DateTime.parse(json["date_of_birth"]),
      gender: genderFromJson(json["gender"]),
      nationality: json["nationality"] ?? "",
      nationalId: json["national_id"] ?? "",
      email: json["email"] ?? "",
      phone: json["phone"] ?? "",
      photoUrl: json["photo_url"] ?? "",
      notes: json["notes"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "first_name": firstName,
      "middle_name": middleName,
      "last_name": lastName,
      "date_of_birth": dateOfBirth.toIso8601String(),
      "gender": gender.name,
      "nationality": nationality,
      "national_id": nationalId,
      "email": email,
      "phone": phone,
      "photo_url": photoUrl,
      "notes": notes,
    };
  }
}
