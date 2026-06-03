import 'dart:convert';
import 'dart:typed_data';

import 'package:pointycastle/export.dart';

Map<String, dynamic> eciesDecrypt(
  String encryptedPayload,
  String privateKeyHex,
) {
  //parse comma seperated bytes string into a raw byte list
  final bytes = Uint8List.fromList(
    encryptedPayload.split(',').map((e) => int.parse(e.trim())).toList(),
  );

  //strip 0x prefix if present and convert to big number
  final privKeyD = BigInt.parse(
    privateKeyHex.startsWith('0x') ? privateKeyHex.substring(2) : privateKeyHex,
    radix: 16,
  );

  //blob structure: [65 bytes ephemeral pubkey][16 bytes iv][ciphertext][16 bytes tag]
  final sharedSecret = _ecdh(bytes.sublist(0, 65), privKeyD);
  final aesKey = _hkdf(sharedSecret);
  final plaintext = _aesGcmDecrypt(
    aesKey,
    bytes.sublist(65, 81),
    bytes.sublist(81, bytes.length - 16),
    bytes.sublist(bytes.length - 16),
  );

  return jsonDecode(utf8.decode(plaintext)) as Map<String, dynamic>;
}

//multiply the backends temp public key by our private key on secp256k1
//gives us the same shared secret the backend had when encrypting
Uint8List _ecdh(Uint8List ephPubKeyBytes, BigInt privKeyD) {
  final domain = ECDomainParameters('secp256k1');
  final sharedPoint = domain.curve.decodePoint(ephPubKeyBytes)! * privKeyD;
  final x = sharedPoint!.x!.toBigInteger()!;
  final hex = x.toRadixString(16).padLeft(64, '0');
  return Uint8List.fromList([
    for (var i = 0; i < hex.length; i += 2)
      int.parse(hex.substring(i, i + 2), radix: 16),
  ]);
}

//turn the raw shared secret into a proper 32 byte aes key using hkdf-sha256
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
