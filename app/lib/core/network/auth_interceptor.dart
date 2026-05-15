import 'package:app/core/services/token_storage_services.dart';
import 'package:app/feature/auth/data/datasources/auth_datasource.dart';
import 'package:dio/dio.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.tokenStorage,
    required this.dio,
  });

  final TokenStorageService tokenStorage;
  final Dio dio;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await tokenStorage.getAccessToken();
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken == null) {
        await tokenStorage.clearTokens();
        handler.next(err);
        return;
      }

      // Fetch a new access token
      final datasource = AuthDatasource(dio);
      final newToken = await datasource.refreshAccessToken(refreshToken);
      await tokenStorage.saveTokens(newToken.accessToken, newToken.refreshToken);

      // Retry the original request with the new token
      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer ${newToken.accessToken}';
      final response = await dio.fetch(retryOptions);
      handler.resolve(response);
    } catch (_) {
      await tokenStorage.clearTokens();
      handler.next(err);
    }
  }
}
