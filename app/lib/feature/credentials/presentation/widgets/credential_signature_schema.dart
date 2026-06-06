import 'dart:async';
import 'dart:convert';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/widgets/ui/custom_overscroll_glow.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/qr/presentation/providers/qr_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CredentialSignatureSchema extends ConsumerStatefulWidget {
  const CredentialSignatureSchema({
    super.key,
    required this.credential,
    required this.isRevoked,
    required this.onTapBack,
  });

  final Credential credential;
  final bool isRevoked;
  final VoidCallback onTapBack;

  @override
  ConsumerState<CredentialSignatureSchema> createState() =>
      _CredentialSignatureSchemaState();
}

class _CredentialSignatureSchemaState
    extends ConsumerState<CredentialSignatureSchema> {
  bool _devView = true;
  bool _isCopied = false;
  Timer? _resetTimer;

  void _onTapCopy(String text) async {
    setState(() => _isCopied = true);
    await Clipboard.setData(ClipboardData(text: text));
    _resetTimer?.cancel();
    _resetTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      setState(() => _isCopied = false);
    });
  }

  @override
  void dispose() {
    _resetTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final schemaAsync =
        ref.watch(signatureSchemaProvider(widget.credential.id));

    return Column(
      key: const ValueKey("schema"),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Text(
            "Signature Schema",
            style: context.texts.titleLarge!.copyWith(
              color: context.colors.primary,
            ),
          ),
        ),
        const Divider(thickness: 2),
        const SizedBox(height: 8),
        Center(
          child: SegmentedButton<bool>(
            segments: const [
              ButtonSegment(
                value: true,
                label: Text("Developer"),
                icon: Icon(Icons.developer_board),
              ),
              ButtonSegment(
                value: false,
                label: Text("Friendly"),
                icon: Icon(Icons.table_view),
              ),
            ],
            selected: {_devView},
            onSelectionChanged: (value) =>
                setState(() => _devView = value.first),
            showSelectedIcon: true,
          ),
        ),
        const SizedBox(height: 12),
        ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.45,
          ),
          child: ScrollConfiguration(
            behavior: CustomOverscrollGlow(glowColor: context.colors.primary),
            child: SingleChildScrollView(
              child: schemaAsync.when(
                data: (data) => _devView
                    ? _developerView(context, data)
                    : _friendlyView(context, data),
                loading: () => const SizedBox(
                  height: 100,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (_, __) => const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text("Failed to load schema"),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        const Divider(thickness: 2),
        Center(
          child: OutlinedButton(
            onPressed: widget.onTapBack,
            child: const Text("BACK"),
          ),
        ),
      ],
    );
  }

  Widget _friendlyView(BuildContext context, Map<String, dynamic> data) {
    final domain = data['domain'] as Map<String, dynamic>;
    final message = data['message'] as Map<String, dynamic>;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Domain",
            style: context.texts.titleSmall!
                .copyWith(color: context.colors.tertiary),
          ),
          const SizedBox(height: 8),
          ...domain.entries.map(
            (e) => _schemaInfoTile(e.key, e.value.toString()),
          ),
          const Divider(thickness: 1),
          const SizedBox(height: 8),
          Text(
            "Message",
            style: context.texts.titleSmall!
                .copyWith(color: context.colors.tertiary),
          ),
          const SizedBox(height: 8),
          ...message.entries
              .map((e) => _schemaInfoTile(e.key, e.value.toString())),
        ],
      ),
    );
  }

  Widget _developerView(BuildContext context, Map<String, dynamic> data) {
    final pretty = const JsonEncoder.withIndent("  ").convert(data);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          SelectableText(
            pretty,
            style: const TextStyle(
              fontFamily: "monospace",
              fontSize: 12,
            ),
          ),
          IconButton(
            onPressed: _isCopied ? null : () => _onTapCopy(pretty),
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              transitionBuilder: (child, animation) => ScaleTransition(
                scale: animation,
                child: child,
              ),
              child: _isCopied
                  ? Icon(
                      Icons.done_all_rounded,
                      key: const ValueKey("done"),
                      size: 20,
                      color: AppColors.textMuted,
                    )
                  : Icon(
                      Icons.copy,
                      key: const ValueKey("copy"),
                      size: 20,
                      color: context.colors.primary,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _schemaInfoTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
