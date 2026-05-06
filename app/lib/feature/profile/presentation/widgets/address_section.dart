import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/info_section.dart';
import 'package:app/core/widgets/info_tile.dart';
import 'package:app/feature/profile/domain/models/student.dart';
import 'package:app/feature/profile/presentation/widgets/custom_text_button.dart';
import 'package:flutter/material.dart';

class AddressSection extends StatelessWidget {
  const AddressSection({
    super.key,
    required this.student,
    required this.onTap,
  });
  final Student student;
  final void Function() onTap;
  @override
  Widget build(BuildContext context) {
    final address = student.address;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InfoSection(
        title: "Address Info",
        editButton: CustomTextButton(
          label: "EDIT",
          color: context.colors.primary,
          onTap: onTap,
        ),
        widgets: [
          InfoTile(
            label: "Address Line 1",
            trailing: Text(address?.addressLine1 ?? ""),
            icon: Icons.location_on_outlined,
          ),
          InfoTile(
            label: "Street",
            trailing: Text(address?.street ?? ""),
            icon: Icons.signpost_outlined,
          ),
          InfoTile(
            label: "Postal Code",
            trailing: Text(address?.postalCode ?? ""),
            icon: Icons.local_post_office_outlined,
          ),
          InfoTile(
            label: "City",
            trailing: Text(address?.city ?? ""),
            icon: Icons.apartment,
          ),
          InfoTile(
            label: "Country",
            trailing: Text(address?.country ?? ""),
            icon: Icons.public,
          ),
        ],
      ),
    );
  }
}
