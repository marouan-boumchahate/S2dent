enum AppNotificationType {
  credentialIssuance,
  attendenceIssuance,
  credentialsRevoked,
  general,
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    required this.type,
  });

  final String id;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;
  final AppNotificationType type;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'],
      title: json['title'],
      body: json['body'],
      isRead: json['is_read'],
      createdAt: DateTime.parse(json['created_at']),
      type: AppNotificationType.values.byName(json['type']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "title": title,
      "body": body,
      "is_read": isRead,
      "created_at": createdAt.toIso8601String(),
      "type": type.name,
    };
  }

  //preventing object reconsturction on value change
  AppNotification copyWith({bool? isRead}) {
    return AppNotification(
      id: id,
      title: title,
      body: body,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      type: type,
    );
  }
}
