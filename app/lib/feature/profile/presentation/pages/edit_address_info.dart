import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/buttons/primary_button.dart';
import 'package:app/core/widgets/custom_appbar.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/editible_textfield.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EditAddressInfoPage extends ConsumerStatefulWidget {
  const EditAddressInfoPage({
    super.key,
    required this.student,
  });

  final Student student;

  @override
  ConsumerState<EditAddressInfoPage> createState() =>
      _EditAddressInfoPageState();
}

class _EditAddressInfoPageState extends ConsumerState<EditAddressInfoPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _addressLine1Controller;
  late final TextEditingController _addressLine2Controller;
  late final TextEditingController _streetController;
  late final TextEditingController _districtController;
  late final TextEditingController _stateController;
  late final TextEditingController _postalCodeController;
  late final TextEditingController _cityController;
  late final TextEditingController _countryController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final address = widget.student.address;

    _addressLine1Controller =
        TextEditingController(text: address?.addressLine1 ?? "");
    _addressLine2Controller =
        TextEditingController(text: address?.addressLine2 ?? "");
    _streetController = TextEditingController(text: address?.street ?? "");
    _districtController = TextEditingController(text: address?.district ?? "");
    _stateController = TextEditingController(text: address?.state ?? "");
    _postalCodeController =
        TextEditingController(text: address?.postalCode ?? "");
    _cityController = TextEditingController(text: address?.city ?? "");
    _countryController = TextEditingController(text: address?.country ?? "");
  }

  @override
  void dispose() {
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _streetController.dispose();
    _districtController.dispose();
    _stateController.dispose();
    _postalCodeController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    FocusManager.instance.primaryFocus?.unfocus();
    final data = _buildUpdateData();
    if (!data.hasChanges) {
      Navigator.pop(context);
      return;
    }

    setState(() => _isSaving = true);

    final saved =
        await ref.read(profileControllerProvider.notifier).updateProfile(data);

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (saved) {
      Navigator.pop(context);
      return;
    }

    final error = ref.read(profileControllerProvider).whenOrNull(
          error: (error, stackTrace) => error.toString(),
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? "Profile could not be updated.")),
    );
  }

  ProfileUpdateData _buildUpdateData() {
    final address = widget.student.address;

    return ProfileUpdateData(
      addressLine1:
          _changedValue(address?.addressLine1, _addressLine1Controller),
      addressLine2:
          _changedValue(address?.addressLine2, _addressLine2Controller),
      street: _changedValue(address?.street, _streetController),
      district: _changedValue(address?.district, _districtController),
      state: _changedValue(address?.state, _stateController),
      postalCode: _changedValue(address?.postalCode, _postalCodeController),
      city: _changedValue(address?.city, _cityController),
      country: _changedValue(address?.country, _countryController),
    );
  }

  String? _changedValue(
    String? originalValue,
    TextEditingController controller,
  ) {
    final original = originalValue ?? "";
    final updated = controller.text.trim();
    if (updated == original) return null;
    return updated;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      appBar: CustomAppbar(),
      body: MainLayout(
        topSafeArea: false,
        children: [
          _body(),
        ],
      ),
    );
  }

  Form _body() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          EditibleTextfield(
            label: "Address Line 1",
            controller: _addressLine1Controller,
            validator: _validateRequired,
          ),
          EditibleTextfield(
            label: "Address Line 2",
            controller: _addressLine2Controller,
          ),
          EditibleTextfield(
            label: "Street",
            controller: _streetController,
          ),
          EditibleTextfield(
            label: "District",
            controller: _districtController,
          ),
          EditibleTextfield(label: "State", controller: _stateController),
          EditibleTextfield(
            label: "Postal Code",
            controller: _postalCodeController,
            keyboardType: TextInputType.number,
          ),
          EditibleTextfield(label: "City", controller: _cityController),
          EditibleTextfield(
            label: "Country",
            controller: _countryController,
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            onTap: _isSaving ? null : _saveProfile,
            label: _isSaving ? "SAVING..." : "SAVE",
            isEnable: !_isSaving,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String? _validateRequired(String? value) {
    if ((value?.trim() ?? "").isEmpty) return "This field is required.";
    return null;
  }
}
