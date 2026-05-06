import 'dart:io';

import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/buttons/custom_backbutton.dart';
import 'package:app/core/widgets/buttons/primary_button.dart';
import 'package:app/core/widgets/custom_appbar.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/editible_textfield.dart';
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
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _notesController;
  XFile? _pickedImage;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = widget.student.user;
    _emailController = TextEditingController(text: user?.email ?? "");
    _phoneController = TextEditingController(text: user?.phone ?? "");
    _notesController = TextEditingController(text: user?.notes ?? "");
  }

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    //close keyboard and remove focus from fields
    FocusManager.instance.primaryFocus?.unfocus();
    final data = _buildUpdateData();
    if (!data.hasChanges) {
      Navigator.pop(context);
      return;
    }

    setState(() {
      _isSaving = true;
    });

    final saved =
        await ref.read(profileControllerProvider.notifier).updateProfile(data);

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

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
    final user = widget.student.user;

    return ProfileUpdateData(
      email: _changedValue(user?.email, _emailController),
      phone: _changedValue(user?.phone, _phoneController),
      photoUrl: _pickedImage?.path,
      notes: _changedValue(user?.notes, _notesController),
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
      appBar: CustomAppbar(),
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
          _photoPicker(context),
          const SizedBox(height: 16),
          EditibleTextfield(
            label: "Email",
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            validator: ProfileUpdateData.validateEmail,
          ),
          EditibleTextfield(
            label: "Phone Number",
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            validator: ProfileUpdateData.validatePhone,
          ),
          EditibleTextfield(
            label: "Notes",
            controller: _notesController,
            maxLines: 3,
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

  Widget _photoPicker(BuildContext context) {
    return Center(
      child: GestureDetector(
        onTap: _pickImage,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            CircleAvatar(
              radius: 50,
              backgroundColor: context.colors.surfaceContainer,
              backgroundImage: _pickedImage != null
                  ? FileImage(File(_pickedImage!.path))
                  : null,
              child: _pickedImage == null
                  ? Text(
                      _initials(),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: CircleAvatar(
                radius: 16,
                backgroundColor: context.colors.primary,
                child: const Icon(
                  Icons.camera_alt,
                  size: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
