import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:flutter/rendering.dart';

class CredentialDatasource {
  final List<Map<String, dynamic>> _listJson = [
    {
      "id": "4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea",
      "title": "Bachelor of Computer Engineering",
      "code": "CRD_2605191",
      "type": "degree",
      "student_name": "Ousama Jamal",
      "issued_at": "2026-06-30T00:00:00.000Z",
      "is_revoked": false,
    },
    {
      "id": "7bc91234-789a-11ee-b962-0242ac120002",
      "title": "Official Academic Transcript",
      "code": "CRD_2605192",
      "type": "transcript",
      "student_name": "Ousama Jamal",
      "issued_at": "2026-01-15T00:00:00.000Z",
      "is_revoked": false,
    },
    {
      "id": "9de34567-789a-11ee-b962-0242ac120003",
      "title": "Proof of Enrollment",
      "code": "CRD_2605193",
      "type": "enrollment",
      "student_name": "Ousama Jamal",
      "issued_at": "2022-09-19T00:00:00.000Z",
      "is_revoked": false,
    },
    {
      "id": "2ef45678-789a-11ee-b962-0242ac120004",
      "title": "Data Structures - Attendance",
      "code": "CRD_2605194",
      "type": "attendance",
      "student_name": "Ousama Jamal",
      "issued_at": "2025-12-20T00:00:00.000Z",
      "is_revoked": false,
    },
    {
      "id": "3fg56789-789a-11ee-b962-0242ac120005",
      "title": "Dean's List - Fall 2025",
      "code": "CRD_2605195",
      "type": "achievement",
      "student_name": "Ousama Jamal",
      "issued_at": "2026-01-10T00:00:00.000Z",
      "is_revoked": false,
    },
    {
      "id": "4gh67890-789a-11ee-b962-0242ac120006",
      "title": "Flutter Development Bootcamp",
      "code": "CRD_2605196",
      "type": "certificate",
      "student_name": "Ousama Jamal",
      "issued_at": "2025-08-05T00:00:00.000Z",
      "is_revoked": true,
    },
  ];

  final Map<String, Map<String, dynamic>> _detailJson = {
    "4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea": {
      "meta": {
        "id": "4ed8fd80-536c-43e1-9104-2ffc5c3fd7ea",
        "title": "Bachelor of Computer Engineering",
        "code": "CRD_2605191",
        "type": "degree",
        "description":
            "Awarded upon successful completion of the Computer Engineering program.",
        "issued_at": "2026-06-30T00:00:00.000Z",
        "is_revoked": false,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        "revoke_tx_hash": null,
        "revocation_reason": null,
        "credential_index": 0,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0x9f22a60410f61124a9df3495200c6badf3ae4950088102f07288b6bee03212cf",
        "signature":
            "0x3b9a97ed3b68f6d865c4f7afa0261c0b900bbc5aa26289587c37cd5fc58f87fb",
      },
      "encryptedPayload": "dummyEncryptedPayload001",
    },
    "7bc91234-789a-11ee-b962-0242ac120002": {
      "meta": {
        "id": "7bc91234-789a-11ee-b962-0242ac120002",
        "title": "Official Academic Transcript",
        "code": "CRD_2605192",
        "type": "transcript",
        "description": "Official transcript for the 2025-2026 academic year.",
        "issued_at": "2026-01-15T00:00:00.000Z",
        "is_revoked": false,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7",
        "revoke_tx_hash": null,
        "revocation_reason": null,
        "credential_index": 1,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        "signature":
            "0xdef789abc123def789abc123def789abc123def789abc123def789abc123def7",
      },
      "encryptedPayload": "dummyEncryptedPayload002",
    },
    "9de34567-789a-11ee-b962-0242ac120003": {
      "meta": {
        "id": "9de34567-789a-11ee-b962-0242ac120003",
        "title": "Proof of Enrollment",
        "code": "CRD_2605193",
        "type": "enrollment",
        "description":
            "Confirms active enrollment in the Computer Engineering department.",
        "issued_at": "2022-09-19T00:00:00.000Z",
        "is_revoked": false,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0x111aaa222bbb333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111a",
        "revoke_tx_hash": null,
        "revocation_reason": null,
        "credential_index": 2,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0x111bbb222ccc333ddd444eee555fff666aaa777bbb888ccc999ddd000eee111b",
        "signature":
            "0x222ccc333ddd444eee555fff666aaa777bbb888ccc999ddd000eee111fff222c",
      },
      "encryptedPayload": "dummyEncryptedPayload003",
    },
    "2ef45678-789a-11ee-b962-0242ac120004": {
      "meta": {
        "id": "2ef45678-789a-11ee-b962-0242ac120004",
        "title": "Data Structures - Attendance",
        "code": "CRD_2605194",
        "type": "attendance",
        "description":
            "Attendance record for Data Structures course - Fall 2025.",
        "issued_at": "2025-12-20T00:00:00.000Z",
        "is_revoked": false,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0x222bbb333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222b",
        "revoke_tx_hash": null,
        "revocation_reason": null,
        "credential_index": 3,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0x333ddd444eee555fff666aaa777bbb888ccc999ddd000eee111fff222aaa333d",
        "signature":
            "0x444eee555fff666aaa777bbb888ccc999ddd000eee111fff222aaa333bbb444e",
      },
      "encryptedPayload": "dummyEncryptedPayload004",
    },
    "3fg56789-789a-11ee-b962-0242ac120005": {
      "meta": {
        "id": "3fg56789-789a-11ee-b962-0242ac120005",
        "title": "Dean's List - Fall 2025",
        "code": "CRD_2605195",
        "type": "achievement",
        "description":
            "Awarded for achieving a GPA of 3.8 or above during Fall 2025 semester.",
        "issued_at": "2026-01-10T00:00:00.000Z",
        "is_revoked": false,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0x333ccc444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222fff333c",
        "revoke_tx_hash": null,
        "revocation_reason": null,
        "credential_index": 4,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0x555fff666aaa777bbb888ccc999ddd000eee111fff222aaa333bbb444ccc555f",
        "signature":
            "0x666aaa777bbb888ccc999ddd000eee111fff222aaa333bbb444ccc555ddd666a",
      },
      "encryptedPayload": "dummyEncryptedPayload005",
    },
    "4gh67890-789a-11ee-b962-0242ac120006": {
      "meta": {
        "id": "4gh67890-789a-11ee-b962-0242ac120006",
        "title": "Flutter Development Bootcamp",
        "code": "CRD_2605196",
        "type": "certificate",
        "description":
            "Certificate of completion for the Flutter & Dart development bootcamp.",
        "issued_at": "2025-08-05T00:00:00.000Z",
        "is_revoked": true,
      },
      "student": {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Ousama Jamal",
      },
      "blockchain": {
        "issue_tx_hash":
            "0x444ddd555eee666fff777aaa888bbb999ccc000ddd111eee222fff333aaa444d",
        "revoke_tx_hash":
            "0x44aa09ed5c7cc214c9abb911cc89cc0a8e5603901f29b102cf10cd796a25f121",
        "revocation_reason": "Issued by mistake.",
        "credential_index": 5,
        "academy_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "issuer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      "verification": {
        "payload_hash":
            "0x777bbb888ccc999ddd000eee111fff222aaa333bbb444ccc555ddd666eee777b",
        "signature":
            "0x888ccc999ddd000eee111fff222aaa333bbb444ccc555ddd666eee777fff888c",
      },
      "encryptedPayload": "dummyEncryptedPayload006",
    },
  };

  final Map<String, Credential> _detailCache = {};

  void clearDetailCache() => _detailCache.clear();

  Future<List<CredentialItem>> getCredentials() async {
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint("Credentials List API has been called");
    return _listJson.map((item) => CredentialItem.fromJson(item)).toList();
  }

  Future<Credential> getCredentialById(String id) async {
    if (_detailCache.containsKey(id)) {
      debugPrint("Credential brought from cache");
      return _detailCache[id]!;
    }

    await Future.delayed(const Duration(milliseconds: 300));
    final detail = _detailJson[id];
    if (detail == null) throw Exception("Credential not found");
    final credential = Credential.fromJson(detail);
    _detailCache[id] = credential;
    debugPrint("Credential has been fetched via API");
    return credential;
  }
}
