import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/custom_appbar.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_card.dart';
import 'package:app/feature/qr/presentation/pages/qr_generate.dart';
import 'package:app/feature/qr/presentation/widgets/duration_picker_bottom_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class QRCredentialPicker extends ConsumerStatefulWidget {
  const QRCredentialPicker({super.key});

  @override
  ConsumerState<QRCredentialPicker> createState() => _QRCredentialPickerState();
}

class _QRCredentialPickerState extends ConsumerState<QRCredentialPicker> {
  final TextEditingController _searchController = TextEditingController();

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

  List<CredentialItem> _filtered(List<CredentialItem> credentials) {
    return credentials.where((credential) {
      return _searchController.text.isEmpty ||
          credential.title
              .toLowerCase()
              .contains(_searchController.text.toLowerCase());
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final credentialController = ref.watch(credentialControllerProvider);
    return Scaffold(
      appBar: CustomAppbar(color: context.colors.surface),
      body: credentialController.when(
        data: (data) => _body(context, data),
        error: (error, stackTrace) => Center(child: Text("ERROR")),
        loading: () => LoadingState(),
      ),
    );
  }

  Widget _body(BuildContext context, List<CredentialItem> data) {
    final filtered = _filtered(data);
    return MainLayout(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(
            "Choose a credential to generate a QR Code",
            style: context.texts.displaySmall
                ?.copyWith(fontSize: 28)
                .copyWith(color: context.colors.primary),
          ),
        ),
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: "Search credentials...",
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () => _searchController.clear(),
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.blueGrey.withAlpha(160)),
            ),
            contentPadding: const EdgeInsets.symmetric(vertical: 4),
          ),
        ),
        const SizedBox(height: 8),
        const Divider(thickness: 2),
        if (data.isEmpty)
          _emptyBody("You have no credentials yet!")
        else if (filtered.isEmpty)
          _emptyBody("No credentials match your search"),
        ...List.generate(
          filtered.length,
          (index) => CredentialCard(
            credential: filtered[index],
            onTap: () async {
              final duration = await showModalBottomSheet<int>(
                context: context,
                builder: (ctx) => const DurationPickerBottomSheet(),
              );
              if (duration == null || !context.mounted) return;
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => QRGenerate(
                    credentialId: filtered[index].id,
                    title: filtered[index].title,
                    code: filtered[index].code,
                    type: filtered[index].type,
                    expirationTimeInSeconds: duration,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _emptyBody(String message) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.45,
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
