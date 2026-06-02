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
          data: {
            'success': true,
            'data': {
              'message': 'Sign this nonce to authenticate: mock-nonce-abc123',
            },
            'message': 'Nonce expires in 5 minutes',
          },
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

    if (options.path.contains('/auth/otp/send')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'data': {
              'message':
                  'Sign this nonce to verify your identity: mock-nonce-0a9f2b3c4d5e6f7a',
            },
            'message': 'check your email for the otp code',
          },
        ),
      );
      return;
    }

    if (options.path.contains('/identity/students/request-issuance')) {
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'success': true,
            'data': {
              'wallet_address':
                  '0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C',
            },
            'message':
                'Student identity issuance request submitted successfully',
          },
        ),
      );
      return;
    }

    handler.next(options);
  }
}
