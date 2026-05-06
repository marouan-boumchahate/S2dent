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

  bool get userChanges =>
      phone != null || email != null || photoUrl != null || notes != null;

  bool get addressChanges =>
      addressLine1 != null ||
      addressLine2 != null ||
      street != null ||
      district != null ||
      state != null ||
      postalCode != null ||
      city != null ||
      country != null;

  //did the user change  any info at all ?
  bool get hasChanged => userChanges || addressChanges;

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
