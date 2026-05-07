import 'package:flutter/material.dart';

class AnimationWrapper extends StatelessWidget {
  const AnimationWrapper({
    super.key,
    required this.widget,
  });
  final Widget widget;
  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: Duration(milliseconds: 300),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: child,
      ),
      child: widget,
    );
  }
}
