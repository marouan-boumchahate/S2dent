import 'package:dio/dio.dart';

String errorMessage(Object e) {
  if (e is DioException) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return "Request timed out. Please check your connection and try again.";
      case DioExceptionType.connectionError:
        return "No internet connection. Please try again.";
      case DioExceptionType.badResponse:
        return switch (e.response?.statusCode) {
          401 => "Your session has expired. Please log in again.",
          403 => "You don't have permission to do that.",
          500 || 503 => "Server error. Please try again later.",
          _ => "Something went wrong. Please try again.",
        };
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
