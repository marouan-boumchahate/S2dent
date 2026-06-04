import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class CredentialDatasource {
  CredentialDatasource(this._dio);

  final Dio _dio;
  final Map<String, Credential> _detailCache = {};

  void clearDetailCache() => _detailCache.clear();

  Future<List<CredentialItem>> getCredentials() async {
    debugPrint("Credentials List API has been called");
    final response = await _dio.get('/credentials');
    final list = response.data['data']['credentials'] as List;
    return list
        .map((item) => CredentialItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Credential> getCredentialById(String id) async {
    if (_detailCache.containsKey(id)) {
      debugPrint("Credential brought from cache");
      return _detailCache[id]!;
    }

    debugPrint("Credential has been fetched via API");
    final response = await _dio.get('/credentials/$id');
    final credential = Credential.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
    _detailCache[id] = credential;
    return credential;
  }
}
