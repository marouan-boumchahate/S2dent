import 'dart:async';

import 'package:app/core/config/app_config.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class NotificationDatasource {
  io.Socket? _socket;
  final _streamController = StreamController<AppNotification>.broadcast();
  final _authErrorController = StreamController<String>.broadcast();

  Stream<AppNotification> get notificationStream => _streamController.stream;
  Stream<String> get authErrorStream => _authErrorController.stream;

  void connect(String accessToken) {
    //disconnect if there is already an existing connection (on refreshToken)
    if (_socket != null) disconnect();
    final socketUrl = AppConfig.apiUrl.endsWith('/api')
        ? AppConfig.apiUrl.substring(0, AppConfig.apiUrl.length - 4)
        : AppConfig.apiUrl;
    _socket = io.io(
      socketUrl,
      io.OptionBuilder()
          .setTransports(["websocket"])
          .disableAutoConnect()
          .build(),
    );
    //send accessToken to authenticate
    _socket!.onConnect((data) => _socket!.emit("join", accessToken));

    //listener for notifications
    _socket!.on(
      "notification",
      (data) {
        try {
          // socket.io sends [payload, ackFn] when server emits with ack callback
          final payload = data is List ? data[0] : data;
          final ack = data is List && data.length > 1 ? data[1] : null;
          final notification = AppNotification.fromJson(
            Map<String, dynamic>.from(payload as Map),
          );
          _streamController.add(notification);
          if (ack is Function) ack('received');
        } catch (e) {
          debugPrint("Notification parsing failed: $e | raw: $data");
        }
      },
    );

    // server emits this when token is invalid or expires mid-session,
    // then disconnects immediately — signal the provider to refresh & reconnect
    _socket!.on("auth_error", (data) {
      debugPrint("Socket auth_error: $data");
      _socket = null;
      _authErrorController.add(data?.toString() ?? "auth_error");
    });

    //finally connect
    _socket!.connect();
  }

  void ackEvent(String eventId) {
    _socket?.emit("ack_event", {"id": eventId});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    if (!_streamController.isClosed) _streamController.close();
    if (!_authErrorController.isClosed) _authErrorController.close();
  }
}
