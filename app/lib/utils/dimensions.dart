import 'package:flutter/material.dart';

double screenWidth(BuildContext context) {
  return MediaQuery.sizeOf(context).width;
}

double screenHeight(BuildContext context) {
  return MediaQuery.sizeOf(context).height;
}

double widthConstraints(BuildContext context) {
  return isMobile(context)
      ? screenWidth(context) * 0.9
      : screenWidth(context) * 0.6;
}

bool isMobile(BuildContext context) {
  return screenWidth(context) < 600;
}
