enum AppNotificationStatus {
  verified,
  failed,
  unknown,
}

AppNotificationStatus appNotificationStatusFromJson(String value) {
  try {
    return AppNotificationStatus.values.byName(value);
  } catch (e) {
    return AppNotificationStatus.unknown;
  }
}

class AppNotification {
  const AppNotification({
    required this.eventId,
    required this.txHash,
    required this.message,
    required this.createdAt,
    required this.status,
  });

  final String eventId;
  final String txHash;
  final String message;
  final DateTime createdAt;
  final AppNotificationStatus status;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      eventId: json['event_id'],
      txHash: json['tx_hash'],
      message: json['message'],
      createdAt: DateTime.parse(json['created_at']),
      status: appNotificationStatusFromJson(json['status']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "event_id": eventId,
      "tx_hash": txHash,
      "message": message,
      "created_at": createdAt.toIso8601String(),
      "status": status.name,
    };
  }
}
