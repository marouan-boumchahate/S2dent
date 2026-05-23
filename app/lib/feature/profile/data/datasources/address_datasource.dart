import 'package:app/feature/profile/domain/models/address.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:flutter/rendering.dart';

class AddressDataSource {
  AddressDataSource();

  Map<String, dynamic> _addressJson = {
    "address_line1": "Atasehir Campus",
    "address_line2": "",
    "street": "Fenerbahce Street",
    "district": "Atasehir",
    "state": "Istanbul",
    "postal_code": "34758",
    "city": "Istanbul",
    "country": "Turkiye",
    "latitude": "40.9914",
    "longtitude": "29.1244",
  };

  Future<Student> getAddressInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Profile - Get address info API has been called");
    return Student(
      address: Address.fromJson(_addressJson),
      identity: null,
      department: null,
      user: null,
      academic: null,
      university: null,
    );
  }

  Future<Student> updateAddressInfo(ProfileUpdateData data) async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Profile - Update address info API has been called");
    final address = Address.fromJson(_addressJson).copyWith(
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      street: data.street,
      district: data.district,
      state: data.state,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
    );

    _addressJson = address.toJson();
    return Student(
      address: address,
      identity: null,
      department: null,
      user: null,
      academic: null,
      university: null,
    );
  }
}
