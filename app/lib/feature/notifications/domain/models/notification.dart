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
    required this.createdAt,
    required this.type,
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final AppNotificationType type;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'],
      title: json['title'],
      body: json['body'],
      createdAt: DateTime.parse(json['created_at']),
      type: AppNotificationType.values.byName(json['type']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "title": title,
      "body": body,
      "created_at": createdAt.toIso8601String(),
      "type": type.name,
    };
  }
}
