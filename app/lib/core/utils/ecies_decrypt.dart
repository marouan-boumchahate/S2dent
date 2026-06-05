import 'dart:convert';
import 'dart:typed_data';

import 'package:pointycastle/export.dart';

Map<String, dynamic> eciesDecrypt(
  String encryptedPayload,
  String privateKey,
) {
  //parse comma seperated bytes string into a raw byte list
  final bytes = Uint8List.fromList(
    encryptedPayload.split(',').map((e) => int.parse(e.trim())).toList(),
  );

  //strip 0x prefix if present and convert to big number
  final privKeyD = BigInt.parse(
    privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey,
    radix: 16,
  );

  //blob structure: [65 bytes ephemeral pubkey][16 bytes nonce][16 bytes tag][ciphertext]
  final ephPubKeyBytes = bytes.sublist(0, 65);
  final nonce = bytes.sublist(65, 81);
  final tag = bytes.sublist(81, 97);
  final ciphertext = bytes.sublist(97);

  //ecdh shared point as uncompressed (04 || x || y, 65 bytes)
  final sharedPoint = _ecdh(ephPubKeyBytes, privKeyD);

  //hkdf input is senderPoint || sharedPoint (65 + 65 = 130 bytes)
  final aesKey = _hkdf(Uint8List.fromList([...ephPubKeyBytes, ...sharedPoint]));

  final plaintext = _aesGcmDecrypt(aesKey, nonce, ciphertext, tag);

  return jsonDecode(utf8.decode(plaintext)) as Map<String, dynamic>;
}

//multiply the backends temp public key by our private key on secp256k1
//returns uncompressed point: 04 || x || y (65 bytes)
Uint8List _ecdh(Uint8List ephPubKeyBytes, BigInt privKeyD) {
  final domain = ECDomainParameters('secp256k1');
  final point = domain.curve.decodePoint(ephPubKeyBytes)! * privKeyD;
  final x = point!.x!.toBigInteger()!;
  final y = point.y!.toBigInteger()!;
  final xHex = x.toRadixString(16).padLeft(64, '0');
  final yHex = y.toRadixString(16).padLeft(64, '0');
  final result = Uint8List(65);
  result[0] = 0x04;
  for (var i = 0; i < 32; i++) {
    result[1 + i] = int.parse(xHex.substring(i * 2, i * 2 + 2), radix: 16);
    result[33 + i] = int.parse(yHex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return result;
}

//turn the shared secret into a 32 byte aes key using hkdf-sha256
Uint8List _hkdf(Uint8List ikm) {
  //extract
  final extract = HMac(SHA256Digest(), 64);
  extract.init(KeyParameter(Uint8List(32)));
  extract.update(ikm, 0, ikm.length);
  final prk = Uint8List(32);
  extract.doFinal(prk, 0);

  //expand
  final expand = HMac(SHA256Digest(), 64);
  expand.init(KeyParameter(prk));
  expand.updateByte(0x01);
  final okm = Uint8List(32);
  expand.doFinal(okm, 0);
  return okm;
}

//aes-256-gcm decrypt, pointycastle expects ciphertext and tag joined together
Uint8List _aesGcmDecrypt(
  Uint8List key,
  Uint8List iv,
  Uint8List ciphertext,
  Uint8List tag,
) {
  final cipher = GCMBlockCipher(AESEngine());
  cipher.init(false, AEADParameters(KeyParameter(key), 128, iv, Uint8List(0)));
  return cipher.process(Uint8List.fromList([...ciphertext, ...tag]));
}
