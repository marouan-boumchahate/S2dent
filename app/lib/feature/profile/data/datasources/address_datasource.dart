import 'package:app/feature/profile/domain/models/address.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class AddressDataSource {
  const AddressDataSource(this._dio);

  final Dio _dio;

  Future<Student> getAddressInfo() async {
    debugPrint("Profile - Get address info API has been called");
    final response = await _dio.get('/addresses');
    return Student(
      address: Address.fromJson(
        response.data['data']['address'] as Map<String, dynamic>,
      ),
      identity: null,
      department: null,
      user: null,
      academic: null,
      university: null,
    );
  }

  Future<Student> updateAddressInfo(ProfileUpdateData data) async {
    debugPrint("Profile - Update address info API has been called");
    final response = await _dio.put(
      '/addresses',
      data: {
        if (data.addressLine1 != null) 'address_line1': data.addressLine1,
        if (data.addressLine2 != null) 'address_line2': data.addressLine2,
        if (data.street != null) 'street': data.street,
        if (data.district != null) 'district': data.district,
        if (data.state != null) 'state': data.state,
        if (data.postalCode != null) 'postal_code': data.postalCode,
        if (data.city != null) 'city': data.city,
        if (data.country != null) 'country': data.country,
      },
    );
    return Student(
      address: Address.fromJson(
        response.data['data']['address'] as Map<String, dynamic>,
      ),
      identity: null,
      department: null,
      user: null,
      academic: null,
      university: null,
    );
  }
}
