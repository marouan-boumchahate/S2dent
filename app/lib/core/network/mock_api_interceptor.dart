import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class MockApiInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('[MockAPI] ${options.method} ${options.path}');

    if (options.path.contains('/nonce')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {'message': 'Please sign this nonce to authenticate: mock-nonce-abc123'},
        ),
      );
      return;
    }

    if (options.path.contains('/verify')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'data': {
              'access_token': 'mock_access_token_${DateTime.now().millisecondsSinceEpoch}',
              'refresh_token': 'mock_refresh_token_${DateTime.now().millisecondsSinceEpoch}',
            },
          },
        ),
      );
      return;
    }

    if (options.path.contains('/refresh')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'data': {
              'access_token': 'mock_access_token_refreshed_${DateTime.now().millisecondsSinceEpoch}',
              'refresh_token': 'mock_refresh_token_refreshed_${DateTime.now().millisecondsSinceEpoch}',
            },
          },
        ),
      );
      return;
    }

    if (options.path.contains('/logout')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {'success': true},
        ),
      );
      return;
    }

    handler.next(options);
  }
}
