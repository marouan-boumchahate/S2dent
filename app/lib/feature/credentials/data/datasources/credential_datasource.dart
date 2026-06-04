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
      "encryptedPayload":
          "4,181,134,244,77,128,175,208,139,190,36,53,101,95,225,107,182,251,168,27,29,241,68,78,13,195,236,186,46,44,210,167,40,48,32,83,37,152,53,223,72,199,54,154,72,85,220,181,90,76,18,40,2,65,139,197,88,48,26,250,160,169,159,145,240,113,36,31,75,108,111,252,243,16,138,164,34,160,193,151,74,122,240,130,199,67,172,116,233,21,207,36,42,88,68,180,158,122,218,127,196,208,136,141,82,119,86,23,118,173,35,120,27,72,239,86,129,251,191,133,129,6,17,212,29,232,1,255,130,242,2,50,182,50,100,214,26,252,29,169,198,157,38,145,41,13,45,224,186,94,188,56,0,146,252,81,136,21,81,2,198,99,173,4,88,198,165,11,164,138,89,37,13,154,93,82,147,211,68,189,29,147,243,27,114,246,43,71,210,238,12,94,77,44,170,230,151,225,157,102,182,123,125,61,178,173,15,54,240,143,158,62,231,171,122,13,21,184,29,20,153,192,53,33,19,219,118,144,215,229,131,98,201,106,177,216,167,211,211,53,101,7,79,32,249,155,255,218,33,76,80,232,177",
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
