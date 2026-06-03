import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/services/pk_storage.service.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/feature/home/presentation/widgets/pk_textfield.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum DialogContentType {
  alert,
  submission,
}

class PkSetupDialog extends ConsumerStatefulWidget {
  const PkSetupDialog({
    super.key,
    this.onSave,
  });
  final VoidCallback? onSave;
  @override
  ConsumerState<PkSetupDialog> createState() => _PkSetupDialogState();
}

class _PkSetupDialogState extends ConsumerState<PkSetupDialog> {
  var dialogContentType = DialogContentType.alert;
  final _pkController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool isSaving = false;

  @override
  void dispose() {
    _pkController.dispose();
    super.dispose();
  }

  String? _validatePK(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "Private key is required";
    }
    final stripped = value.trim().replaceFirst(RegExp(r'^0x'), '');
    if (stripped.length != 64) {
      return "Invalid private key length";
    }
    if (!RegExp(r'^[0-9a-fA-F]+$').hasMatch(stripped)) {
      return "Invalid private key format";
    }
    return null;
  }

  Future<void> _onActionPress() async {
    if (dialogContentType == DialogContentType.alert) {
      setState(() {
        dialogContentType = DialogContentType.submission;
      });
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      isSaving = true;
    });
    await ref.read(pkStorageServiceProvider).savePK(_pkController.text.trim());
    setState(() {
      isSaving = false;
    });
    if (!mounted) return;
    Navigator.of(context).pop();
    widget.onSave?.call();
  }

  String get _actionLabel {
    if (dialogContentType == DialogContentType.alert) {
      return "Save one";
    }
    return "Save";
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: dialogContentType == DialogContentType.alert
          ? Text("No Private Key found!")
          : Text("Paste your PK here"),
      actions: [
        TextButton(
          onPressed: isSaving ? null : () => Navigator.pop(context),
          child: Text("Skip"),
        ),
        FilledButton(
          onPressed: isSaving ? null : _onActionPress,
          child: isSaving ? CircularProgressIndicator() : Text(_actionLabel),
        ),
      ],
      content: Container(
        padding: const EdgeInsets.all(16),
        width: widthConstraints(context),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              dialogContentType == DialogContentType.alert
                  ? Text(
                      "You have no saved PRIVATE KEY, please, copy the private key from your wallet, and paste it here.",
                    )
                  : PkTextfield(
                      hint: "* * * * * * * * * * *",
                      controller: _pkController,
                      obsecure: true,
                      validator: _validatePK,
                    )
            ],
          ),
        ),
      ),
    );
  }
}
