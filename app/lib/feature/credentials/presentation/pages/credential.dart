import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_card.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_details.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_status_badge.dart';
import 'package:app/feature/credentials/presentation/widgets/filter_bottom_sheet.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum SortBy {
  date,
  name,
}

enum SortOrder {
  ascending,
  descending,
}

class CredentialPage extends ConsumerStatefulWidget {
  const CredentialPage({super.key});

  @override
  ConsumerState<CredentialPage> createState() => _CredentialPageState();
}

class _CredentialPageState extends ConsumerState<CredentialPage> {
  final TextEditingController _searchController = TextEditingController();
  CredentialStatus? _selectedStatus;
  SortBy _sortBy = SortBy.date;
  SortOrder _sortOrder = SortOrder.descending;

  bool get _hasActiveFilters =>
      _selectedStatus != null ||
      _sortBy != SortBy.date ||
      _sortOrder != SortOrder.descending;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Credential> _applyFilters(List<Credential> originalList) {
    var result = originalList.where((credential) {
      final nameMatch = _searchController.text.isEmpty ||
          credential.title
              .toLowerCase()
              .contains(_searchController.text.toLowerCase());
      final statusMatch =
          _selectedStatus == null || credential.status == _selectedStatus;
      return nameMatch && statusMatch;
    }).toList();

    result.sort((credA, credB) {
      final int cmp = _sortBy == SortBy.date
          ? credA.issuedAt.compareTo(credB.issuedAt)
          : credA.title.toLowerCase().compareTo(credB.title.toLowerCase());
      return _sortOrder == SortOrder.ascending ? cmp : -cmp;
    });

    return result;
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => FilterBottomSheet(
        selectedStatus: _selectedStatus,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
        onStatusChanged: (status) {
          setState(() {
            _selectedStatus = status;
          });
        },
        onSortByChanged: (sortBy) {
          setState(() {
            _sortBy = sortBy;
          });
        },
        onSortOrderChanged: (order) {
          setState(() {
            _sortOrder = order;
          });
        },
        onClear: () {
          setState(() {
            _selectedStatus = null;
            _sortBy = SortBy.date;
            _sortOrder = SortOrder.descending;
          });
        },
      ),
    );
  }

  void showCredentialDetails(Credential credential) {
    showDialog(
      context: context,
      builder: (ctx) => CredentialDetailsDialog(credential: credential),
    );
  }

  @override
  Widget build(BuildContext context) {
    final credentialsData = ref.watch(credentialControllerProvider);

    return credentialsData.when(
      data: (data) {
        if (data.isEmpty) {
          return _emptyBody();
        } else {
          return _body(data);
        }
      },
      error: (error, stackTrace) => Center(
        child: Text("ERROR OCCURED: $error"),
      ),
      loading: () => LoadingState(),
    );
  }

  Widget _body(List<Credential> data) {
    final filtered = _applyFilters(data);
    return MainLayout(
      children: [
        _HeaderSection(
          searchController: _searchController,
          hasActiveFilters: _hasActiveFilters,
          onFilterTap: _showFilterSheet,
          credentialCount: filtered.length,
        ),
        const SizedBox(height: 16),
        ...List.generate(
          filtered.length,
          (index) => CredentialCard(
            credential: filtered[index],
            onTap: () => showCredentialDetails(filtered[index]),
          ),
        ),
      ],
    );
  }

  Widget _emptyBody() {
    return Center(
      child: Text(
        "You have no credentials yet !",
        style: context.texts.titleLarge!.copyWith(
          color: context.colors.primary,
        ),
      ),
    );
  }
}

class _HeaderSection extends StatelessWidget {
  const _HeaderSection({
    required this.searchController,
    required this.hasActiveFilters,
    required this.onFilterTap,
    required this.credentialCount,
  });

  final TextEditingController searchController;
  final bool hasActiveFilters;
  final VoidCallback onFilterTap;
  final int credentialCount;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Credentials",
            style: context.texts.displaySmall!
                .copyWith(color: context.colors.primary),
          ),
          Text(
            "$credentialCount credentials",
            style: context.texts.bodyMedium!.copyWith(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    hintText: "Search credentials...",
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.blueGrey.withAlpha(160),
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 4),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Badge(
                isLabelVisible: hasActiveFilters,
                child: IconButton(
                  onPressed: onFilterTap,
                  icon: const Icon(Icons.tune_rounded),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
