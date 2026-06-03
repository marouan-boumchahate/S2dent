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
  }

  Future<String?> getPK() async {
    final pk = await _flutterStorage.read(key: "PK");
    return pk;
  }

  Future<void> clearPK() async {
    await _flutterStorage.delete(key: "PK");
  }

  Future<void> saveAddress(String address) async {
    await _flutterStorage.write(key: "walletAddress", value: address);
  }

  Future<String?> getAddress() async {
    return _flutterStorage.read(key: "walletAddress");
  }

  Future<void> handleWalletChange(String newAddress) async {
    final storedAddress = await getAddress();
    if (storedAddress != null && storedAddress != newAddress) {
      await clearPK();
    }
    await saveAddress(newAddress);
  }
}

final pkStorageServiceProvider = Provider<PKStorageService>(
  (ref) => PKStorageService(),
);
