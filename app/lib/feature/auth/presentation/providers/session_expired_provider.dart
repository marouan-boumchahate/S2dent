import 'package:flutter_riverpod/legacy.dart';

//this is set to true by dioProvider when the refresh token is dead and then
//authControllerProvider listens to this and calls logout() for full cleanup.
final sessionExpiredProvider = StateProvider<bool>((ref) => false);
