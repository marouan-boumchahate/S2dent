import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/core/widgets/ui/custom_appbar.dart';
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
    if (!data.hasChanged) {
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
    showAlertDialog(context, error ?? "Profile could not be updated.", type: AlertType.error);
  }

  ProfileUpdateData _buildUpdateData() {
    return ProfileUpdateData(
      addressLine1: _addressLine1Controller.text.trim(),
      addressLine2: _addressLine2Controller.text.trim(),
      street: _streetController.text.trim(),
      district: _districtController.text.trim(),
      state: _stateController.text.trim(),
      postalCode: _postalCodeController.text.trim(),
      city: _cityController.text.trim(),
      country: _countryController.text.trim(),
    );
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
          EditibleTextfield(
            label: "City",
            controller: _cityController,
            validator: ProfileUpdateData.validateCity,
          ),
          EditibleTextfield(
            label: "Country",
            controller: _countryController,
            validator: ProfileUpdateData.validateCountry,
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

}
