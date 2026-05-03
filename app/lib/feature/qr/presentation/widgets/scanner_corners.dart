import 'package:flutter/material.dart';

class ScannerCorners extends CustomPainter {
  @override
  bool shouldRepaint(_) => false;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF7DF9C2)
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const length = 24.0;
    const radius = 4.0;

    canvas.drawPath(
        Path()
          ..moveTo(0, length)
          ..lineTo(0, radius)
          ..arcToPoint(Offset(radius, 0), radius: const Radius.circular(radius))
          ..lineTo(length, 0),
        paint);
    canvas.drawPath(
        Path()
          ..moveTo(size.width - length, 0)
          ..lineTo(size.width - radius, 0)
          ..arcToPoint(Offset(size.width, radius),
              radius: const Radius.circular(radius))
          ..lineTo(size.width, length),
        paint);
    canvas.drawPath(
        Path()
          ..moveTo(0, size.height - length)
          ..lineTo(0, size.height - radius)
          ..arcToPoint(Offset(radius, size.height),
              radius: const Radius.circular(radius))
          ..lineTo(length, size.height),
        paint);
    canvas.drawPath(
        Path()
          ..moveTo(size.width - length, size.height)
          ..lineTo(size.width - radius, size.height)
          ..arcToPoint(Offset(size.width, size.height - radius),
              radius: const Radius.circular(radius))
          ..lineTo(size.width, size.height - length),
        paint);
  }
}
