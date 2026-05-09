import 'dart:async';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';

class RefreshButton extends StatefulWidget {
  const RefreshButton({
    super.key,
    required this.onTap,
    this.cooldown = const Duration(seconds: 10),
  });
  final void Function() onTap;
  final Duration cooldown;

  @override
  State<RefreshButton> createState() => _RefreshButtonState();
}

class _RefreshButtonState extends State<RefreshButton> {
  bool _isCoolingDown = false;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _handleTap() {
    if (_isCoolingDown) return;
    widget.onTap();
    setState(() => _isCoolingDown = true);
    _cooldownTimer = Timer(widget.cooldown, () {
      if (mounted) setState(() => _isCoolingDown = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: Opacity(
        opacity: _isCoolingDown ? 0.4 : 1.0,
        child: Container(
          width: 55,
          height: 55,
          decoration: BoxDecoration(
            color: context.colors.surfaceContainer,
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.blueGrey.withAlpha(160),
              width: 2,
            ),
          ),
          child: Icon(Icons.refresh, color: context.colors.primary),
        ),
      ),
    );
  }
}
