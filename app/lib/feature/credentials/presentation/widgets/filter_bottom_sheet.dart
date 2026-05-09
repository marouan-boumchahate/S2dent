import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/pages/credential.dart';
import 'package:flutter/material.dart';

class FilterBottomSheet extends StatefulWidget {
  const FilterBottomSheet({
    super.key,
    required this.selectedStatus,
    required this.sortBy,
    required this.sortOrder,
    required this.onStatusChanged,
    required this.onSortByChanged,
    required this.onSortOrderChanged,
    required this.onClear,
  });

  final CredentialStatus? selectedStatus;
  final SortBy sortBy;
  final SortOrder sortOrder;
  final ValueChanged<CredentialStatus?> onStatusChanged;
  final ValueChanged<SortBy> onSortByChanged;
  final ValueChanged<SortOrder> onSortOrderChanged;
  final VoidCallback onClear;

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late CredentialStatus? _selectedStatus;
  late SortBy _sortBy;
  late SortOrder _sortOrder;

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.selectedStatus;
    _sortBy = widget.sortBy;
    _sortOrder = widget.sortOrder;
  }

  void _onStatusChanged(CredentialStatus? status) {
    setState(() => _selectedStatus = status);
    widget.onStatusChanged(status);
  }

  void _onSortByChanged(SortBy sortBy) {
    setState(() => _sortBy = sortBy);
    widget.onSortByChanged(sortBy);
  }

  void _onSortOrderChanged(SortOrder sortOrder) {
    setState(() => _sortOrder = sortOrder);
    widget.onSortOrderChanged(sortOrder);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Filter & Sort", style: context.texts.titleLarge),
              TextButton(
                onPressed: () {
                  setState(() {
                    _selectedStatus = null;
                    _sortBy = SortBy.date;
                    _sortOrder = SortOrder.descending;
                  });
                  widget.onClear();
                  Navigator.pop(context);
                },
                child: const Text("Clear all"),
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 8),
          Text("Status", style: context.texts.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text("All"),
                selected: _selectedStatus == null,
                onSelected: (value) => _onStatusChanged(null),
              ),
              ...CredentialStatus.values
                  .where((s) => s != CredentialStatus.unknown)
                  .map(
                    (status) => FilterChip(
                      label: Text(
                        status.name[0].toUpperCase() + status.name.substring(1),
                      ),
                      selected: _selectedStatus == status,
                      onSelected: (value) => _onStatusChanged(
                        _selectedStatus == status ? null : status,
                      ),
                    ),
                  ),
            ],
          ),
          const SizedBox(height: 16),
          Text("Sort by", style: context.texts.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text("Date"),
                selected: _sortBy == SortBy.date,
                onSelected: (value) => _onSortByChanged(SortBy.date),
              ),
              FilterChip(
                label: const Text("Name"),
                selected: _sortBy == SortBy.name,
                onSelected: (value) => _onSortByChanged(SortBy.name),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text("Order", style: context.texts.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text("Ascending"),
                selected: _sortOrder == SortOrder.ascending,
                onSelected: (value) => _onSortOrderChanged(SortOrder.ascending),
              ),
              FilterChip(
                label: const Text("Descending"),
                selected: _sortOrder == SortOrder.descending,
                onSelected: (value) =>
                    _onSortOrderChanged(SortOrder.descending),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
