import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:flutter/material.dart';

class DurationPickerBottomSheet extends StatefulWidget {
  const DurationPickerBottomSheet({super.key});

  @override
  State<DurationPickerBottomSheet> createState() =>
      _DurationPickerBottomSheetState();
}

class _DurationPickerBottomSheetState extends State<DurationPickerBottomSheet> {
  static const _options = [
    (label: "5 min", seconds: 300),
    (label: "30 min", seconds: 1800),
    (label: "1 hour", seconds: 3600),
    (label: "1 day", seconds: 86400),
    (label: "3 days", seconds: 259200),
  ];

  int _selected = 300;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("QR Code Duration", style: context.texts.titleLarge),
          const SizedBox(height: 4),
          Text(
            "How long should this QR code be valid?",
            style: context.texts.bodyMedium?.copyWith(color: Colors.grey),
          ),
          const Divider(
            height: 24,
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _options
                .map(
                  (option) => FilterChip(
                    label: Text(option.label),
                    selected: _selected == option.seconds,
                    onSelected: (value) =>
                        setState(() => _selected = option.seconds),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: "Generate QR",
            onTap: () => Navigator.pop(context, _selected),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}
