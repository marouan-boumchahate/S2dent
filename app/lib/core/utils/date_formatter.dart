import 'package:intl/intl.dart';

String dateFormatter(DateTime? date) {
  if (date != null) {
    return DateFormat("yyy-MM-dd").format(date);
  } else {
    return "";
  }
}
