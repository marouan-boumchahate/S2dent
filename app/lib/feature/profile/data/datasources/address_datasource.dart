import 'package:app/feature/profile/domain/models/address.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:dio/dio.dart';

class AddressDataSource {
  const AddressDataSource(this._dio);

  final Dio _dio;

  Future<Student> getAddressInfo() async {
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
    final response = await _dio.put(
      '/addresses',
      data: {
        'address_line1': data.addressLine1,
        'address_line2': data.addressLine2,
        'street': data.street,
        'district': data.district,
        'state': data.state,
        'postal_code': data.postalCode,
        'city': data.city,
        'country': data.country,
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
