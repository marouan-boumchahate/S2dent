class Department {
  const Department({
    required this.name,
    required this.code,
    required this.faculty,
  });

  final String name;
  final String code;
  final String faculty;

  factory Department.fromJson(Map<String, dynamic> json) {
    return Department(
      name: json["name"] ?? "",
      code: json["code"] ?? "",
      faculty: json["faculty"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "name": name,
      "code": code,
      "faculty": faculty,
    };
  }
}
