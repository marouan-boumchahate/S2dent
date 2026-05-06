import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/buttons/primary_button.dart';
import 'package:app/core/widgets/custom_appbar.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/feature/profile/domain/models/profile_update_data.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:app/feature/profile/presentation/widgets/editible_textfield.dart';
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
  late final TextEditingController _emailController;
  late final TextEditingController _notesController;
  late String _phoneNumber;
  XFile? _pickedImage;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = widget.student.user;
    _emailController = TextEditingController(text: user?.email ?? "");
    _phoneNumber = user?.phone ?? "";
    _notesController = TextEditingController(text: user?.notes ?? "");
  }

  @override
  void dispose() {
    _emailController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

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
      phone: _changedPhoneValue(user?.phone),
      photoUrl: _pickedImage?.path,
      notes: _changedValue(user?.notes, _notesController),
    );
  }

  String? _changedPhoneValue(String? originalValue) {
    final original = originalValue ?? "";
    final updated = _phoneNumber.trim();
    if (updated == original) return null;
    return updated;
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
          PhotoPicker(
            pickedImage: _pickedImage,
            initials: _initials(),
            onTap: _pickImage,
          ),
          const SizedBox(height: 16),
          EditibleTextfield(
            label: "Email",
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            validator: ProfileUpdateData.validateEmail,
          ),
          PhoneField(
            phoneNumber: _phoneNumber,
            onChanged: (phoneNumber) {
              _phoneNumber = phoneNumber;
            },
            onSaved: (phoneNumber) {
              _phoneNumber = phoneNumber;
            },
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
}
