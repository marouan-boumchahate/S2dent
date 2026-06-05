import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class QRAction extends StatelessWidget {
  const QRAction({
    super.key,
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 26),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          border: Border.all(color: Colors.blueGrey.withAlpha(160)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withAlpha(60),
                      border: Border.all(color: color),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      icon,
                      size: 32,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 6,
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              label,
                              style: context.texts.titleLarge
                                  ?.copyWith(color: color),
                            ),
                            Text(
                              description,
                              style: context.texts.bodyMedium!
                                  .copyWith(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
