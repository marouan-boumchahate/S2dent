import 'package:app/core/config/app_config.dart';
import 'package:app/core/network/auth_interceptor.dart';
import 'package:app/core/network/mock_api_interceptor.dart';
import 'package:app/core/services/token_storage_services.dart';
import 'package:app/feature/auth/presentation/providers/session_expired_provider.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  if (AppConfig.useMockApi) {
    dio.interceptors.add(MockApiInterceptor());
  } else {
    final tokenStorage = ref.watch(tokenStorageServiceProvider);
    dio.interceptors.add(
      AuthInterceptor(
        tokenStorage: tokenStorage,
        dio: dio,
        onSessionExpired: () {
          ref.read(sessionExpiredProvider.notifier).state = true;
        },
      ),
    );
    //debug purposses
    dio.interceptors.add(
      InterceptorsWrapper(
        onResponse: (r, handler) {
          debugPrint(
              '[API] ${r.requestOptions.method} ${r.requestOptions.path} → ${r.statusCode}');
          handler.next(r);
        },
        onError: (e, handler) {
          debugPrint(
              '[API ERROR] ${e.requestOptions.method} ${e.requestOptions.path} → ${e.response?.statusCode} | ${e.response?.data}');
          handler.next(e);
        },
      ),
    );
  }

  return dio;
});
