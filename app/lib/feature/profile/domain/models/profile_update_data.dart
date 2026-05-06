class ProfileUpdateData {
  const ProfileUpdateData({
    this.phone,
    this.email,
    this.photoUrl,
    this.notes,
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
  final String? notes;
  final String? addressLine1;
  final String? addressLine2;
  final String? street;
  final String? district;
  final String? state;
  final String? postalCode;
  final String? city;
  final String? country;

  static final RegExp phoneRegExp = RegExp(r'^\+\d{7,14}$');
  //USED IN THE UI LAYER
  static String? validateEmail(String? value) {
    final text = value?.trim() ?? "";
    if (!text.contains("@") || !text.contains(".")) {
      return "Please enter a valid email address.";
    }
    return null;
  }

  static String? validatePhone(String? value) {
    if (!phoneRegExp.hasMatch(value?.trim() ?? "")) {
      return "Phone number must start with country key and contain 8-15 digits.";
    }
    return null;
  }

  bool get hasUserChanges =>
      phone != null || email != null || photoUrl != null || notes != null;

  bool get hasAddressChanges =>
      addressLine1 != null ||
      addressLine2 != null ||
      street != null ||
      district != null ||
      state != null ||
      postalCode != null ||
      city != null ||
      country != null;

  bool get hasChanges => hasUserChanges || hasAddressChanges;
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
    return null;
  }
}
