import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/services/media_upload_service.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/core/widgets/ui/custom_appbar.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/phone_field.dart';
import 'package:app/feature/profile/presentation/widgets/photo_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class EditPersonalInfoPage extends ConsumerStatefulWidget {
  const EditPersonalInfoPage({
    super.key,
    required this.student,
  });

  final Student student;

  @override
  ConsumerState<EditPersonalInfoPage> createState() =>
      _EditPersonalInfoPageState();
}

class _EditPersonalInfoPageState extends ConsumerState<EditPersonalInfoPage> {
  final _formKey = GlobalKey<FormState>();
  late String _phoneNumber;
  XFile? _pickedImage;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _phoneNumber = widget.student.user?.phone ?? "";
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    FocusManager.instance.primaryFocus?.unfocus();

    setState(
      () => _isSaving = true,
    );

    try {
      String? uploadedPhotoUrl;
      if (_pickedImage != null) {
        uploadedPhotoUrl = await ref
            .read(mediaUploadServiceProvider)
            .uploadImage(_pickedImage!.path);
      }

      final data = _buildUpdateData(uploadedPhotoUrl);
      if (!data.hasChanged) {
        if (mounted) Navigator.pop(context);
        return;
      }

      final saved = await ref
          .read(profileControllerProvider.notifier)
          .updateProfile(data);

      if (!mounted) return;
      if (saved) {
        Navigator.pop(context);
        return;
      }

      final error = ref.read(profileControllerProvider).whenOrNull(
            error: (error, stackTrace) => error.toString(),
          );
      showAlertDialog(context, error ?? "Profile could not be updated.",
          type: AlertType.error);
    } catch (e) {
      if (mounted) {
        showAlertDialog(context, "Failed to upload photo. Please try again.",
            type: AlertType.error);
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  ProfileUpdateData _buildUpdateData(String? uploadedPhotoUrl) {
    final user = widget.student.user;
    return ProfileUpdateData(
      phone: _changedPhoneValue(user?.phone),
      photoUrl: uploadedPhotoUrl,
    );
  }

  String? _changedPhoneValue(String? originalValue) {
    final original = originalValue ?? "";
    final updated = _phoneNumber.trim();
    if (updated == original) return null;
    return updated;
  }

  Future<void> _pickImage() async {
    final image = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (image == null) return;
    setState(() => _pickedImage = image);
  }

  String _initials() {
    final user = widget.student.user;
    if (user == null) return "?";
    return "${user.firstName[0]}${user.lastName[0]}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      appBar: CustomAppbar(
        isDisabledBackButton: _isSaving,
      ),
      body: MainLayout(
        topSafeArea: false,
        children: [
          _body(context),
        ],
      ),
    );
  }

  Form _body(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          PhotoPicker(
            pickedImage: _pickedImage,
            photoUrl: widget.student.user?.photoUrl ?? "",
            initials: _initials(),
            onTap: _pickImage,
          ),
          const SizedBox(height: 16),
          PhoneField(
            phoneNumber: _phoneNumber,
            onChanged: (phoneNumber) {
              _phoneNumber = phoneNumber;
            },
            onSaved: (phoneNumber) {
              _phoneNumber = phoneNumber;
            },
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
