import 'package:app/core/extensions/context_extensions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl_phone_field/intl_phone_field.dart';

class PhoneField extends StatelessWidget {
  const PhoneField({
    super.key,
    required this.phoneNumber,
    required this.onChanged,
    required this.onSaved,
  });

  final String phoneNumber;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSaved;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: IntlPhoneField(
        initialValue: phoneNumber,
        initialCountryCode: phoneNumber.trim().startsWith("+") ? null : "TR",
        cursorColor: context.colors.primary,
        dropdownTextStyle: Theme.of(context).textTheme.bodyMedium,
        flagsButtonPadding: const EdgeInsets.only(left: 8),
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        invalidNumberMessage: "Please enter a valid phone number.",
        decoration: InputDecoration(
          labelText: "Phone Number",
          filled: true,
          fillColor: context.colors.surfaceContainer,
          contentPadding: const EdgeInsets.all(16),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.blueGrey.withAlpha(160)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: context.colors.primary, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: context.colors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: context.colors.error, width: 2),
          ),
        ),
        onChanged: (phone) {
          onChanged(phone.number.trim().isEmpty ? "" : phone.completeNumber);
        },
        onSaved: (phone) {
          onSaved(
            phone == null || phone.number.trim().isEmpty
                ? ""
                : phone.completeNumber,
          );
        },
      ),
    );
  }
}
