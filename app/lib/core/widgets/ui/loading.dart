import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class LoadingState extends StatelessWidget {
  const LoadingState({
    super.key,
    this.animationPath,
  });
  final String? animationPath;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Lottie.asset(
        animationPath ?? "assets/animations/box_loading.json",
        width: 200,
      ),
    );
  }
}
