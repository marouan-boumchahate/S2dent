import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/credentials/presentation/pages/credential.dart';
import 'package:flutter/material.dart';

class FilterBottomSheet extends StatefulWidget {
  const FilterBottomSheet({
    super.key,
    required this.filterRevoked,
    required this.sortBy,
    required this.sortOrder,
    required this.onFilterRevokedChanged,
    required this.onSortByChanged,
    required this.onSortOrderChanged,
    required this.onClear,
  });

  final bool? filterRevoked;
  final SortBy sortBy;
  final SortOrder sortOrder;
  final ValueChanged<bool?> onFilterRevokedChanged;
  final ValueChanged<SortBy> onSortByChanged;
  final ValueChanged<SortOrder> onSortOrderChanged;
  final VoidCallback onClear;

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late bool? _filterRevoked;
  late SortBy _sortBy;
  late SortOrder _sortOrder;

  @override
  void initState() {
    super.initState();
    _filterRevoked = widget.filterRevoked;
    _sortBy = widget.sortBy;
    _sortOrder = widget.sortOrder;
  }

  void _onFilterRevokedChanged(bool? value) {
    setState(() => _filterRevoked = value);
    widget.onFilterRevokedChanged(value);
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
                    _filterRevoked = null;
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
                selected: _filterRevoked == null,
                onSelected: (value) => _onFilterRevokedChanged(null),
              ),
              FilterChip(
                label: const Text("Valid"),
                selected: _filterRevoked == false,
                onSelected: (value) =>
                    _onFilterRevokedChanged(_filterRevoked == false ? null : false),
              ),
              FilterChip(
                label: const Text("Revoked"),
                selected: _filterRevoked == true,
                onSelected: (value) =>
                    _onFilterRevokedChanged(_filterRevoked == true ? null : true),
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
