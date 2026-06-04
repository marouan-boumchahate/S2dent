class University {
  const University({
    required this.name,
    required this.code,
    required this.email,
    required this.websiteUrl,
    required this.logoUrl,
    required this.phoneNumber,
  });

  final String name;
  final String code;
  final String email;
  final String websiteUrl;
  final String logoUrl;
  final String phoneNumber;

  factory University.fromJson(Map<String, dynamic> json) {
    return University(
      name: json["name"] ?? "",
      code: json["short_name"] ?? "",
      email: json["email"] ?? "",
      websiteUrl: json["website"] ?? "",
      logoUrl: json["logo_url"] ?? "",
      phoneNumber: json["phone"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "name": name,
      "code": code,
      "email": email,
      "website_url": websiteUrl,
      "logo_url": logoUrl,
      "phone_number": phoneNumber,
    };
  }
}
