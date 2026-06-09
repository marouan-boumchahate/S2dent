import 'dart:async';

import 'package:app/core/services/token_storage_services.dart';
import 'package:app/feature/auth/data/datasources/auth_datasource.dart';
import 'package:dio/dio.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.tokenStorage,
    required this.dio,
    this.onSessionExpired,
  });

  final TokenStorageService tokenStorage;
  final Dio dio;
  final void Function()? onSessionExpired;

  //completer to prevent multiple refresh tries at the same time
  static Completer<String>? _refreshCompleter;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    //if the caller is the verifier, dont overwrite the sent token in the header
    if (options.headers.containsKey('Authorization')) {
      handler.next(options);
      return;
    }
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

    //dont try to refresh if the caller explicitly opted out (verifier token requests)
    if (err.requestOptions.extra['skipAuthRefresh'] == true) {
      handler.next(err);
      return;
    }

    //dont try to refresh if the refreshToken itself is dead
    if (err.requestOptions.path.contains('/auth/refresh')) {
      await tokenStorage.clearTokens();
      onSessionExpired?.call();
      handler.next(err);
      return;
    }

    try {
      final newAccessToken = await _refreshOnce();
      final retryOptions = err.requestOptions;

      retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final response = await dio.fetch(retryOptions);
      handler.resolve(response);
    } catch (e) {
      await tokenStorage.clearTokens();
      onSessionExpired?.call();
      handler.next(err);
    }
  }

  Future<String> _refreshOnce() async {
    //if a refresh is already running, wait instead of starting another
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String>();
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken == null) throw Exception('No refresh token');

      final datasource = AuthDatasource(dio);
      final newToken = await datasource.refreshAccessToken(refreshToken);
      await tokenStorage.saveTokens(
          newToken.accessToken, newToken.refreshToken);

      _refreshCompleter!.complete(newToken.accessToken);
      return newToken.accessToken;
    } catch (e) {
      _refreshCompleter!.completeError(e);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }
}
