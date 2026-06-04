import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:dio/dio.dart';

class CredentialDatasource {
  CredentialDatasource(this._dio);

  final Dio _dio;
  final Map<String, Credential> _detailCache = {};

  void clearDetailCache() => _detailCache.clear();

  Future<List<CredentialItem>> getCredentials() async {
    final response = await _dio.get('/credentials');
    final list = response.data['data']['credentials'] as List;
    return list
        .map((item) => CredentialItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Credential> getCredentialById(String id) async {
    if (_detailCache.containsKey(id)) return _detailCache[id]!;

    final response = await _dio.get('/credentials/$id');
    final credential = Credential.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
    _detailCache[id] = credential;
    return credential;
  }
}
