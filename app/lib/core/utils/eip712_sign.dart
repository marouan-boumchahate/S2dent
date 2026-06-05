import 'dart:convert';
import 'dart:typed_data';

import 'package:hex/hex.dart';
import 'package:pointycastle/export.dart';

final _params = ECDomainParameters('secp256k1');

// secp256k1 field prime p
final _secp256k1P = BigInt.parse(
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F',
  radix: 16,
);

/// Signs an EIP-712 typed data schema with the given private key.
/// Returns the 65-byte Ethereum signature as "0x..." hex (r || s || v).
String signEIP712(String privateKey, Map<String, dynamic> schema) {
  final cleanHex =
      privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
  final pkInt = BigInt.parse(cleanHex, radix: 16);

  final domain = schema['domain'] as Map<String, dynamic>;
  final types = schema['types'] as Map<String, dynamic>;
  final message = schema['message'] as Map<String, dynamic>;

  // API doesn't send primaryType or EIP712Domain in types — derive both
  final primaryType = types.keys.first;
  final allTypes = {...types, 'EIP712Domain': _domainTypeFields(domain)};

  final domainSep = _hashStruct('EIP712Domain', domain, allTypes);
  final structHash = _hashStruct(primaryType, message, allTypes);

  // \x19\x01 prefix per EIP-712 spec
  final toSign = Uint8List(66);
  toSign[0] = 0x19;
  toSign[1] = 0x01;
  toSign.setRange(2, 34, domainSep);
  toSign.setRange(34, 66, structHash);

  return _ecSign(pkInt, _keccak(toSign));
}

// Builds EIP712Domain field list from whatever keys the domain object contains
List<Map<String, String>> _domainTypeFields(Map<String, dynamic> domain) {
  const knownTypes = {
    'name': 'string',
    'version': 'string',
    'chainId': 'uint256',
    'verifyingContract': 'address',
    'salt': 'bytes32',
  };
  return domain.keys
      .where(knownTypes.containsKey)
      .map((k) => {'name': k, 'type': knownTypes[k]!})
      .toList();
}

Uint8List _keccak(Uint8List data) {
  final d = KeccakDigest(256);
  d.update(data, 0, data.length);
  final out = Uint8List(32);
  d.doFinal(out, 0);
  return out;
}

// EIP-712 type string — primary type first, then dependent types sorted alphabetically
String _encodeType(String typeName, Map<String, dynamic> types) {
  final fields = (types[typeName] as List).cast<Map<String, dynamic>>();
  final body = fields.map((f) => '${f["type"]} ${f["name"]}').join(',');
  final primary = '$typeName($body)';
  final deps = <String>{};
  for (final f in fields) {
    final t = f['type'] as String;
    if (types.containsKey(t) && t != typeName) deps.add(t);
  }
  return primary +
      (deps.toList()..sort()).map((d) => _encodeType(d, types)).join();
}

Uint8List _typeHash(String typeName, Map<String, dynamic> types) {
  return _keccak(Uint8List.fromList(utf8.encode(_encodeType(typeName, types))));
}

Uint8List _hashStruct(
  String typeName,
  Map<String, dynamic> data,
  Map<String, dynamic> types,
) {
  final th = _typeHash(typeName, types);
  final enc = _encodeData(typeName, data, types);
  final buf = Uint8List(32 + enc.length);
  buf.setRange(0, 32, th);
  buf.setRange(32, buf.length, enc);
  return _keccak(buf);
}

Uint8List _encodeData(
  String typeName,
  Map<String, dynamic> data,
  Map<String, dynamic> types,
) {
  final fields = (types[typeName] as List).cast<Map<String, dynamic>>();
  final parts = fields
      .map((f) => _encodeValue(f['type'] as String, data[f['name']], types))
      .toList();
  final buf = Uint8List(parts.fold(0, (s, p) => s + p.length));
  var offset = 0;
  for (final part in parts) {
    buf.setRange(offset, offset + part.length, part);
    offset += part.length;
  }
  return buf;
}

// Encodes a single EIP-712 value to 32 bytes per the spec
Uint8List _encodeValue(String type, dynamic value, Map<String, dynamic> types) {
  if (type == 'string') {
    return _keccak(Uint8List.fromList(utf8.encode(value as String)));
  }
  if (type == 'bytes') return _keccak(value as Uint8List);
  if (type == 'bool') return Uint8List(32)..[31] = (value as bool) ? 1 : 0;
  if (type == 'address') {
    final hex = (value as String).startsWith('0x') ? value.substring(2) : value;
    final padded = Uint8List(32);
    padded.setRange(12, 32, HEX.decode(hex.toLowerCase()));
    return padded;
  }
  if (type.startsWith('uint') || type.startsWith('int')) {
    return _bigIntToBytes32(BigInt.parse(value.toString()));
  }
  if (RegExp(r'^bytes\d+$').hasMatch(type)) {
    final raw = value is String
        ? Uint8List.fromList(
            HEX.decode(value.startsWith('0x') ? value.substring(2) : value))
        : value as Uint8List;
    final padded = Uint8List(32);
    padded.setRange(0, raw.length, raw);
    return padded;
  }
  if (types.containsKey(type)) {
    return _hashStruct(type, value as Map<String, dynamic>, types);
  }
  throw UnsupportedError('EIP-712 type not supported: $type');
}

Uint8List _bigIntToBytes32(BigInt value) {
  final result = Uint8List(32);
  var v = value;
  for (var i = 31; i >= 0; i--) {
    result[i] = (v & BigInt.from(0xff)).toInt();
    v >>= 8;
  }
  return result;
}

String _ecSign(BigInt pkInt, Uint8List digest) {
  // RFC 6979 deterministic k — null digest means input is pre-hashed
  final signer = ECDSASigner(null, HMac(SHA256Digest(), 64));
  signer.init(
      true, PrivateKeyParameter<ECPrivateKey>(ECPrivateKey(pkInt, _params)));
  final sig = signer.generateSignature(digest) as ECSignature;

  final n = _params.n;
  final r = sig.r;
  var s = sig.s;
  // low-S normalization (EIP-2)
  if (s > n >> 1) s = n - s;

  final pubPoint = _params.G * pkInt;
  if (pubPoint == null) throw StateError('Failed to derive public key');
  final recId = _recoveryId(r, s, digest, pubPoint);

  final result = Uint8List(65);
  result.setRange(0, 32, _bigIntToBytes32(r));
  result.setRange(32, 64, _bigIntToBytes32(s));
  result[64] = recId + 27;
  return '0x${HEX.encode(result)}';
}

int _recoveryId(BigInt r, BigInt s, Uint8List digest, ECPoint expected) {
  final expX = expected.x!.toBigInteger()!;
  final expY = expected.y!.toBigInteger()!;
  for (var recId = 0; recId < 4; recId++) {
    final candidate = _recoverPublicKey(recId, r, s, digest);
    if (candidate == null) continue;
    if (candidate.x!.toBigInteger() == expX &&
        candidate.y!.toBigInteger() == expY) {
      return recId;
    }
  }
  throw StateError('Could not determine recovery id');
}

ECPoint? _recoverPublicKey(int recId, BigInt r, BigInt s, Uint8List digest) {
  final n = _params.n;
  final x = r + BigInt.from(recId ~/ 2) * n;
  if (x >= _secp256k1P) return null;

  final R = _pointFromX(x, (recId & 1) == 1);
  if (R == null) return null;

  // R must be in the n-order subgroup
  final nR = R * n;
  if (nR != null && !nR.isInfinity) return null;

  final e = BigInt.parse(HEX.encode(digest), radix: 16);
  final rInv = r.modInverse(n);
  final u1 = (n - e % n) * rInv % n;
  final u2 = s * rInv % n;

  // Q = u1*G + u2*R
  final q1 = _params.G * u1;
  final q2 = R * u2;
  if (q1 == null || q2 == null) return null;
  return q1 + q2;
}

// Reconstruct a curve point from x, choosing the correct y parity
ECPoint? _pointFromX(BigInt x, bool odd) {
  // y^2 = x^3 + 7 (mod p) — secp256k1 curve equation (a=0, b=7)
  final y2 =
      (x.modPow(BigInt.from(3), _secp256k1P) + BigInt.from(7)) % _secp256k1P;
  var y = y2.modPow((_secp256k1P + BigInt.one) >> 2, _secp256k1P);
  if (y.isOdd != odd) y = _secp256k1P - y;
  try {
    return _params.curve.createPoint(x, y);
  } catch (_) {
    return null;
  }
}
