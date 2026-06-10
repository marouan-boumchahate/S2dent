import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_card.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_details.dart';
import 'package:app/feature/credentials/presentation/widgets/filter_bottom_sheet.dart';
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
  bool? _filterRevoked;
  SortBy _sortBy = SortBy.date;
  SortOrder _sortOrder = SortOrder.descending;

  bool get _hasActiveFilters =>
      _filterRevoked != null ||
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

  List<CredentialItem> _applyFilters(List<CredentialItem> originalList) {
    var result = originalList.where((credential) {
      final nameMatch = _searchController.text.isEmpty ||
          credential.title
              .toLowerCase()
              .contains(_searchController.text.toLowerCase());
      final statusMatch =
          _filterRevoked == null || credential.isRevoked == _filterRevoked;
      return nameMatch && statusMatch;
    }).toList();

    result.sort((credA, credB) {
      final int cmp = _sortBy == SortBy.date
          ? (credA.issuedAt ?? DateTime(0))
              .compareTo(credB.issuedAt ?? DateTime(0))
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
        filterRevoked: _filterRevoked,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
        onFilterRevokedChanged: (value) {
          setState(() {
            _filterRevoked = value;
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
            _filterRevoked = null;
            _sortBy = SortBy.date;
            _sortOrder = SortOrder.descending;
          });
        },
      ),
    );
  }

  void _showCredentialDetails(CredentialItem item) {
    showDialog(
      context: context,
      builder: (ctx) => CredentialDetailsDialog(
        id: item.id,
        isRevoked: item.isRevoked,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final credentialsData = ref.watch(credentialControllerProvider);
    final image = ref.watch(logoImageProvider);
    return credentialsData.when(
      data: (data) {
        return _body(data, image);
      },
      error: (error, stackTrace) => Center(
        child: Text("ERROR OCCURED: $error"),
      ),
      loading: () => LoadingState(),
    );
  }

  Widget _body(List<CredentialItem> data, String image) {
    final filtered = _applyFilters(data);
    return RefreshIndicator(
      onRefresh: () =>
          ref.read(credentialControllerProvider.notifier).loadCredentials(),
      child: MainLayout(
        backgroundImage: image,
        children: [
          _HeaderSection(
            searchController: _searchController,
            hasActiveFilters: _hasActiveFilters,
            onFilterTap: _showFilterSheet,
            credentialCount: data.length,
          ),
          const SizedBox(height: 16),
          if (data.isEmpty)
            _emptyBody("You have no credentials yet!")
          else if (filtered.isEmpty)
            _emptyBody("No credentials match your search"),
          ...List.generate(
            filtered.length,
            (index) => CredentialCard(
              credential: filtered[index],
              onTap: () {
                FocusManager.instance.primaryFocus?.unfocus();
                _showCredentialDetails(filtered[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyBody(String message) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.55,
      child: Center(
        child: Text(
          message,
          style: context.texts.titleLarge!.copyWith(
            color: context.colors.primary,
          ),
          textAlign: TextAlign.center,
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
          const SizedBox(height: 16),
          Text(
            "Credentials",
            style: context.texts.displaySmall
                ?.copyWith(fontSize: 28)
                .copyWith(color: context.colors.primary),
          ),
          Text(
            "$credentialCount total credentials",
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
                    suffixIcon: searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () => searchController.clear(),
                          )
                        : null,
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
