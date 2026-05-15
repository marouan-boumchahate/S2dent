import 'package:app/core/config/app_config.dart';
import 'package:app/core/network/auth_interceptor.dart';
import 'package:app/core/network/mock_api_interceptor.dart';
import 'package:app/core/services/token_storage_services.dart';
import 'package:dio/dio.dart';
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
    dio.interceptors.add(AuthInterceptor(tokenStorage: tokenStorage, dio: dio));
  }

  return dio;
});
