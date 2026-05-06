class Address {
  const Address({
    required this.addressLine1,
    required this.addressLine2,
    required this.street,
    required this.district,
    required this.state,
    required this.postalCode,
    required this.city,
    required this.country,
    required this.latitude,
    required this.longtitude,
  });

  final String addressLine1;
  final String addressLine2;
  final String street;
  final String district;
  final String state;
  final String postalCode;
  final String city;
  final String country;
  final String latitude;
  final String longtitude;

  Address copyWith({
    String? addressLine1,
    String? addressLine2,
    String? street,
    String? district,
    String? state,
    String? postalCode,
    String? city,
    String? country,
    String? latitude,
    String? longtitude,
  }) {
    return Address(
      addressLine1: addressLine1 ?? this.addressLine1,
      addressLine2: addressLine2 ?? this.addressLine2,
      street: street ?? this.street,
      district: district ?? this.district,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      city: city ?? this.city,
      country: country ?? this.country,
      latitude: latitude ?? this.latitude,
      longtitude: longtitude ?? this.longtitude,
    );
  }

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      addressLine1: json["address_line1"] ?? "",
      addressLine2: json["address_line2"] ?? "",
      street: json["street"] ?? "",
      district: json["district"] ?? "",
      state: json["state"] ?? "",
      postalCode: json["postal_code"] ?? "",
      city: json["city"] ?? "",
      country: json["country"] ?? "",
      latitude: json["latitude"] ?? "",
      longtitude: json["longtitude"] ?? json["longitude"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "address_line1": addressLine1,
      "address_line2": addressLine2,
      "street": street,
      "district": district,
      "state": state,
      "postal_code": postalCode,
      "city": city,
      "country": country,
      "latitude": latitude,
      "longtitude": longtitude,
    };
  }
}
