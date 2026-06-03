import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PKStorageService {
  final _flutterStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  Future<void> savePK(String pk) async {
    //only one PK is allowed, so it cannot be changed
    final storedPK = await _flutterStorage.read(key: "PK");
    if (storedPK != null) return;
    await _flutterStorage.write(key: "PK", value: pk);
    debugPrint("[PKStorage] PK saved: ${pk.substring(0, 6)}...");
  }

  Future<String?> getPK() async {
    final pk = await _flutterStorage.read(key: "PK");
    debugPrint("[PKStorage] getPK: ${pk == null ? 'null' : 'found'}");
    return pk;
  }

  Future<void> clearPK() async {
    await _flutterStorage.delete(key: "PK");
  }
}

final pkStorageServiceProvider = Provider<PKStorageService>(
  (ref) => PKStorageService(),
);
