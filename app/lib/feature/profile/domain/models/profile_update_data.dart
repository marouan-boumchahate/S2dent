class ProfileUpdateData {
  const ProfileUpdateData({
    this.phone,
    this.email,
    this.photoUrl,
    this.addressLine1,
    this.addressLine2,
    this.street,
    this.district,
    this.state,
    this.postalCode,
    this.city,
    this.country,
  });

  final String? phone;
  final String? email;
  final String? photoUrl;
  final String? addressLine1;
  final String? addressLine2;
  final String? street;
  final String? district;
  final String? state;
  final String? postalCode;
  final String? city;
  final String? country;

  static final RegExp phoneRegExp = RegExp(r'^\+\d{7,15}$');
  //USED IN THE UI LAYER
  static String? validateEmail(String? value) {
    final text = value?.trim() ?? "";
    if (!text.contains("@") || !text.contains(".")) {
      return "Please enter a valid email address.";
    }
    return null;
  }

  static String? validatePhone(String? value) {
    final text = value?.trim() ?? "";
    if (text.isEmpty) return null;
    if (!phoneRegExp.hasMatch(text)) {
      return "Please enter a valid phone number.";
    }
    return null;
  }

  static String? validateCity(String? value) {
    if ((value?.trim() ?? "").isEmpty) return "City is required.";
    return null;
  }

  static String? validateCountry(String? value) {
    if ((value?.trim() ?? "").isEmpty) return "Country is required.";
    return null;
  }

  bool get userChanged =>
      phone != null || email != null || photoUrl != null;

  bool get addressChanged =>
      addressLine1 != null ||
      addressLine2 != null ||
      street != null ||
      district != null ||
      state != null ||
      postalCode != null ||
      city != null ||
      country != null;

  //did the user change  any info at all ?
  bool get hasChanged => userChanged || addressChanged;

  //USED IN DATA LAYER
  String? validate() {
    final updatedPhone = phone;
    if (updatedPhone != null) {
      final error = validatePhone(updatedPhone);
      if (error != null) return error;
    }
    final updatedEmail = email;
    if (updatedEmail != null) {
      final error = validateEmail(updatedEmail);
      if (error != null) return error;
    }
    final updatedCity = city;
    if (updatedCity != null) {
      final error = validateCity(updatedCity);
      if (error != null) return error;
    }
    final updatedCountry = country;
    if (updatedCountry != null) {
      final error = validateCountry(updatedCountry);
      if (error != null) return error;
    }
    return null;
  }
}
