import 'dart:async';

import 'package:app/core/config/app_config.dart';
import 'package:app/feature/notifications/domain/models/notification.dart';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class NotificationDatasource {
  io.Socket? _socket;
  final _streamController = StreamController<AppNotification>.broadcast();
  Stream<AppNotification> get notificationStream => _streamController.stream;

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

    //listener for notifiactions
    _socket!.on(
      "notification",
      (data) {
        try {
          _streamController.add(AppNotification.fromJson(data));
        } catch (e) {
          debugPrint("Notification parsing failed $e");
        }
      },
    );
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
  }
}
