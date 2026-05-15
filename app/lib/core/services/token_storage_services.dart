import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorageService {
  final _flutterStorage = const FlutterSecureStorage();

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await Future.wait([
      _flutterStorage.write(key: "accessToken", value: accessToken),
      _flutterStorage.write(key: "refreshToken", value: refreshToken),
    ]);
  }

  Future<String?> getAccessToken() async {
    return _flutterStorage.read(key: "accessToken");
  }

  Future<String?> getRefreshToken() async {
    return _flutterStorage.read(key: "refreshToken");
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _flutterStorage.delete(key: "accessToken"),
      _flutterStorage.delete(key: "refreshToken"),
    ]);
  }
}

final tokenStorageServiceProvider = Provider<TokenStorageService>(
  (ref) => TokenStorageService(),
);
