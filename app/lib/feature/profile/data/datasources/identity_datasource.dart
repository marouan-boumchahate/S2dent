import 'package:app/feature/profile/domain/models/identity.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:flutter/rendering.dart';

class IdentityDataSource {
  IdentityDataSource();

  final Map<String, dynamic> _identityJson = {
    "wallet_address": "0x4f2aB8Af89539bBBFe73983BfUUBbbDBbBBDD76S86390",
    "identity_tx_hash":
        "0xb6a40a90a8ff601cc045d779c9a544b96e4db5cf24fd1d57392789da1f4f9b02",
    "issued_at": "2025-10-01T09:30:00.000Z",
    "is_revoked": false,
    "revoked_at": null,
  };

  Future<Student> getIdentityInfo() async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Profile - Get identity info API has been called");
    return Student(
      identity: Identity.fromJson(_identityJson),
      address: null,
      department: null,
      user: null,
      academic: null,
    );
  }
}
