import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class MockApiInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('[MockAPI] ${options.method} ${options.path}');

    final path = options.path;

    // ── Auth ──────────────────────────────────────────────────────────────
    if (path.contains('/nonce')) {
      return handler.resolve(_ok(options, {
        'message': 'Sign this nonce to authenticate: mock-nonce-abc123',
      }, 'Nonce expires in 5 minutes'));
    }
    if (path.contains('/verify')) {
      return handler.resolve(_ok(options, {
        'access_token': 'mock_access_token',
        'refresh_token': 'mock_refresh_token',
      }));
    }
    if (path.contains('/refresh')) {
      return handler.resolve(_ok(options, {
        'access_token': 'mock_access_token_refreshed',
        'refresh_token': 'mock_refresh_token_refreshed',
      }));
    }
    if (path.contains('/logout')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {'success': true},
      ));
    }
    if (path.contains('/auth/otp/send')) {
      return handler.resolve(_ok(options, {
        'message': 'Sign this nonce to verify your identity: mock-nonce-0a9f2b3c',
      }, 'check your email for the otp code'));
    }
    if (path.contains('/identity/students/request-issuance')) {
      return handler.resolve(_ok(options, {
        'wallet_address': '0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C',
      }));
    }

    // ── User ─────────────────────────────────────────────────────────────
    if (path == '/users') {
      final body = options.data as Map<String, dynamic>? ?? {};
      return handler.resolve(_ok(options, {
        'user': {
          'first_name': 'Ousama',
          'middle_name': 'Mohammad Khalid',
          'last_name': 'Jamal Eddin',
          'full_name': 'Ousama Mohammad Khalid Jamal Eddin',
          'date_of_birth': '2002-06-04T00:00:00.000Z',
          'gender': 'male',
          'nationality': 'Syrian',
          'national_id': '00000',
          'email': body['email'] ?? 'ousama.eddin@stu.fbu.edu.tr',
          'phone': body['phone'] ?? '+905551957963',
          'photo_url': body['photo_url'] ?? '',
          'notes': null,
        }
      }));
    }
    if (path == '/users/me') {
      return handler.resolve(_ok(options, {
        'user': {
          'first_name': 'Ousama',
          'middle_name': 'Mohammad Khalid',
          'last_name': 'Jamal Eddin',
          'full_name': 'Ousama Mohammad Khalid Jamal Eddin',
          'date_of_birth': '2002-06-04T00:00:00.000Z',
          'gender': 'male',
          'nationality': 'Syrian',
          'national_id': '00000',
          'email': 'ousama.eddin@stu.fbu.edu.tr',
          'phone': '+905551957963',
          'photo_url': '',
          'notes': null,
        }
      }));
    }

    // ── Student ───────────────────────────────────────────────────────────
    if (path == '/students/me') {
      return handler.resolve(_ok(options, {
        'student': {
          'student_number': '220304110',
          'current_level': 4,
          'advisor_name': 'Osman Selvi',
          'enrollment_status': 'active',
          'cgpa': '3.75',
          'enrollment_date': '2022-09-19T00:00:00.000Z',
          'expected_graduation_date': '2026-06-30T00:00:00.000Z',
          'actual_graduation_date': null,
        }
      }));
    }

    // ── Address ───────────────────────────────────────────────────────────
    if (path == '/addresses') {
      if (options.method == 'PUT') {
        final body = options.data as Map<String, dynamic>? ?? {};
        return handler.resolve(_ok(options, {
          'address': {
            'address_line1': body['address_line1'] ?? 'Atasehir Campus',
            'address_line2': body['address_line2'] ?? '',
            'street': body['street'] ?? 'Fenerbahce Street',
            'district': body['district'] ?? 'Atasehir',
            'state': body['state'] ?? 'Istanbul',
            'postal_code': body['postal_code'] ?? '34758',
            'city': body['city'] ?? 'Istanbul',
            'country': body['country'] ?? 'Turkiye',
            'latitude': '40.9914',
            'longitude': '29.1244',
          }
        }));
      }
      return handler.resolve(_ok(options, {
        'address': {
          'address_line1': 'Atasehir Campus',
          'address_line2': '',
          'street': 'Fenerbahce Street',
          'district': 'Atasehir',
          'state': 'Istanbul',
          'postal_code': '34758',
          'city': 'Istanbul',
          'country': 'Turkiye',
          'latitude': '40.9914',
          'longitude': '29.1244',
        }
      }));
    }

    // ── Department ────────────────────────────────────────────────────────
    if (path == '/departments/me') {
      return handler.resolve(_ok(options, {
        'department': {
          'name': 'Computer Engineering',
          'code': 'CE',
          'faculty': 'Engineering and Architecture',
        }
      }));
    }

    // ── University ────────────────────────────────────────────────────────
    if (path == '/academies/summary') {
      return handler.resolve(_ok(options, {
        'name': 'Fenerbahçe University',
        'short_name': 'FBU',
        'email': 'info@fbu.edu.tr',
        'website': 'https://www.fbu.edu.tr',
        'logo_url':
            'https://upload.wikimedia.org/wikipedia/tr/7/72/Fenerbah%C3%A7e_%C3%9Cniversitesi_FB%C3%9C.png',
        'phone': '',
      }));
    }

    // ── Identity ──────────────────────────────────────────────────────────
    if (path == '/identity/students/me') {
      return handler.resolve(_ok(options, {
        'wallet_address': '0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C',
        'identity': {
          'full_name': 'Ousama Jamal Eddin',
          'nationality': 'Syrian',
          'academy_name': 'Fenerbahçe University',
          'department': 'Computer Engineering',
          'country': 'Turkiye',
          'enrollment_date': '2022-09-19T00:00:00.000Z',
        },
        'status': {
          'issued_at': '2025-10-01T09:30:00.000Z',
          'issuer': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          'is_revoked': false,
          'revoked_at': null,
          'revoker': null,
        },
      }));
    }

    // ── Credentials list ──────────────────────────────────────────────────
    if (path == '/credentials') {
      return handler.resolve(_ok(options, {
        'credentials': [
          {
            'id': '4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea',
            'title': 'Bachelor of Computer Engineering',
            'code': 'CRD_2605191',
            'type': 'degree',
            'student_name': 'Ousama Jamal',
            'issued_at': '2026-06-30T00:00:00.000Z',
            'is_revoked': false,
          },
          {
            'id': '7bc91234-789a-11ee-b962-0242ac120002',
            'title': 'Official Academic Transcript',
            'code': 'CRD_2605192',
            'type': 'transcript',
            'student_name': 'Ousama Jamal',
            'issued_at': '2026-01-15T00:00:00.000Z',
            'is_revoked': false,
          },
          {
            'id': '9de34567-789a-11ee-b962-0242ac120003',
            'title': 'Proof of Enrollment',
            'code': 'CRD_2605193',
            'type': 'enrollment',
            'student_name': 'Ousama Jamal',
            'issued_at': '2022-09-19T00:00:00.000Z',
            'is_revoked': false,
          },
        ]
      }));
    }

    // ── Credential signature schema ───────────────────────────────────────
    if (path.endsWith('/signature-schema')) {
      return handler.resolve(_ok(options, {
        'signature_schema': {
          'domain': {
            'name': 'S2dent',
            'version': '1',
            'chainId': 31337,
            'verifyingContract': '0x1234567890abcdef1234567890abcdef12345678',
          },
          'types': {
            'Credential': [
              {'name': 'credentialIdHash', 'type': 'bytes32'},
              {'name': 'title', 'type': 'string'},
              {'name': 'code', 'type': 'string'},
              {'name': 'credentialType', 'type': 'string'},
              {'name': 'authorizerWalletAddress', 'type': 'address'},
              {'name': 'authorizerName', 'type': 'string'},
              {'name': 'issuerWalletAddress', 'type': 'address'},
              {'name': 'studentWalletAddress', 'type': 'address'},
              {'name': 'studentName', 'type': 'string'},
              {'name': 'payloadHash', 'type': 'bytes32'},
            ],
          },
          'message': {
            'credentialIdHash': '0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211',
            'title': 'Bachelor of Computer Engineering',
            'code': 'CRD_2605191',
            'credentialType': 'degree',
            'authorizerWalletAddress': '0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3',
            'authorizerName': 'Fenerbahce University',
            'issuerWalletAddress': '0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3',
            'studentWalletAddress': '0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C',
            'studentName': 'Ousama Jamal',
            'payloadHash': '0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211',
          },
        },
      }));
    }

    // ── Credential verifier token ──────────────────────────────────────────
    if (path.endsWith('/token') && options.method == 'POST') {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {'success': true, 'data': 'mock_verifier_token_abc123xyz', 'message': 'OK'},
      ));
    }

    // ── Credential verification (verifier token) ──────────────────────────
    if (path == '/credentials/verification' && options.method == 'GET') {
      return handler.resolve(_ok(options, {
        'meta': {
          'id': '4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea',
          'title': 'Bachelor of Computer Engineering',
          'code': 'CRD_2605191',
          'type': 'degree',
          'description': 'Awarded upon successful completion of the program.',
          'locale': null,
          'issued_at': '2026-06-30T00:00:00.000Z',
          'is_revoked': false,
        },
        'student': {
          'address': '0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C',
          'name': 'Ousama Jamal',
        },
        'blockchain': {
          'issue_tx_hash': '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
          'revoke_tx_hash': null,
          'revocation_reason': null,
          'credential_index': 0,
          'academy_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          'issuer_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
        'verification': {
          'payload_hash': '0x9f22a60410f61124a9df3495200c6badf3ae4950088102f07288b6bee03212cf',
          'issuer_signature': '0x3b9a97ed3b68f6d865c4f7afa0261c0b900bbc5aa26289587c37cd5fc58f87fb',
          'student_signature': '0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
        },
        'payload': {
          'degree_title': 'Bachelor of Computer Engineering',
          'degree_level': 'bachelor',
          'major': 'Computer Engineering',
          'program_code': 'CE-2022',
          'faculty': 'Engineering and Architecture',
          'department': 'Computer Engineering',
          'graduation_date': '2026-06-30T00:00:00.000Z',
          'gpa': 3.75,
          'gpa_scale': 4.0,
          'class_rank': 5,
          'class_size': 120,
          'honors': 'High Honor',
          'total_credits_earned': 240,
          'required_credits': 240,
        },
        'encryptedPayload': 'dummyEncryptedPayload001',
      }, 'Credential fetched successfully for verification'));
    }

    // ── Credential detail ─────────────────────────────────────────────────
    if (RegExp(r'^/credentials/[^/]+$').hasMatch(path)) {
      final id = path.split('/').last;

      if (id == '7bc91234-789a-11ee-b962-0242ac120002') {
        return handler.resolve(_ok(options, {
          'meta': {
            'id': id,
            'title': 'Official Academic Transcript',
            'code': 'CRD_2605192',
            'type': 'transcript',
            'description': 'Official record of all courses completed and grades achieved.',
            'issued_at': '2026-01-15T00:00:00.000Z',
            'is_revoked': false,
          },
          'student': {
            'address': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            'name': 'Ousama Jamal',
          },
          'blockchain': {
            'issue_tx_hash': '0xbcd456efg789bcd456efg789bcd456efg789bcd456efg789bcd456efg789bcd4',
            'revoke_tx_hash': null,
            'revocation_reason': null,
            'credential_index': 1,
            'academy_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            'issuer_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          },
          'verification': {
            'payload_hash': '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
            'issuer_signature': '0x5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e',
          },
          'encryptedPayload': 'dummyEncryptedPayload002',
        }));
      }

      if (id == '9de34567-789a-11ee-b962-0242ac120003') {
        return handler.resolve(_ok(options, {
          'meta': {
            'id': id,
            'title': 'Proof of Enrollment',
            'code': 'CRD_2605193',
            'type': 'enrollment',
            'description': 'Confirms active enrollment for the current academic year.',
            'issued_at': '2022-09-19T00:00:00.000Z',
            'is_revoked': false,
          },
          'student': {
            'address': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            'name': 'Ousama Jamal',
          },
          'blockchain': {
            'issue_tx_hash': '0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7',
            'revoke_tx_hash': null,
            'revocation_reason': null,
            'credential_index': 2,
            'academy_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            'issuer_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          },
          'verification': {
            'payload_hash': '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
            'issuer_signature': '0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d',
          },
          'encryptedPayload':
              '4,181,134,244,77,128,175,208,139,190,36,53,101,95,225,107,182,251,168,27,29,241,68,78,13,195,236,186,46,44,210,167,40,48,32,83,37,152,53,223,72,199,54,154,72,85,220,181,90,76,18,40,2,65,139,197,88,48,26,250,160,169,159,145,240,113,36,31,75,108,111,252,243,16,138,164,34,160,193,151,74,122,240,130,199,67,172,116,233,21,207,36,42,88,68,180,158,122,218,127,196,208,136,141,82,119,86,23,118,173,35,120,27,72,239,86,129,251,191,133,129,6,17,212,29,232,1,255,130,242,2,50,182,50,100,214,26,252,29,169,198,157,38,145,41,13,45,224,186,94,188,56,0,146,252,81,136,21,81,2,198,99,173,4,88,198,165,11,164,138,89,37,13,154,93,82,147,211,68,189,29,147,243,27,114,246,43,71,210,238,12,94,77,44,170,230,151,225,157,102,182,123,125,61,178,173,15,54,240,143,158,62,231,171,122,13,21,184,29,20,153,192,53,33,19,219,118,144,215,229,131,98,201,106,177,216,167,211,211,53,101,7,79,32,249,155,255,218,33,76,80,232,177',
        }));
      }

      return handler.resolve(_ok(options, {
        'meta': {
          'id': id,
          'title': 'Bachelor of Computer Engineering',
          'code': 'CRD_2605191',
          'type': 'degree',
          'description': 'Awarded upon successful completion of the program.',
          'issued_at': '2026-06-30T00:00:00.000Z',
          'is_revoked': false,
        },
        'student': {
          'address': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          'name': 'Ousama Jamal',
        },
        'blockchain': {
          'issue_tx_hash': '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
          'revoke_tx_hash': null,
          'revocation_reason': null,
          'credential_index': 0,
          'academy_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          'issuer_address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
        'verification': {
          'payload_hash': '0x9f22a60410f61124a9df3495200c6badf3ae4950088102f07288b6bee03212cf',
          'issuer_signature': '0x3b9a97ed3b68f6d865c4f7afa0261c0b900bbc5aa26289587c37cd5fc58f87fb',
        },
        'encryptedPayload': 'dummyEncryptedPayload001',
      }));
    }

    // ── Media upload ──────────────────────────────────────────────────────
    if (path == '/media/upload') {
      return handler.resolve(_ok(options, {
        'url': 'https://cdn.s2dent.io/mock/photo.jpg',
      }));
    }

    handler.next(options);
  }

  Response _ok(RequestOptions options, Map<String, dynamic> data,
      [String message = 'OK']) {
    return Response(
      requestOptions: options,
      statusCode: 200,
      data: {'success': true, 'data': data, 'message': message},
    );
  }
}
