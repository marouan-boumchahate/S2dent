import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/widgets/ui/info_section.dart';
import 'package:app/core/widgets/ui/info_tile.dart';
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
          address?.addressLine1 == null || address!.addressLine1.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "Address Line 1",
                  trailing: Text(address.addressLine1),
                  icon: Icons.location_on_outlined,
                ),
          address?.addressLine2 == null || address!.addressLine2.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "Address Line 2",
                  trailing: Text(address.addressLine2),
                  icon: Icons.location_on,
                ),

          address?.street == null || address!.street.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "Street",
                  trailing: Text(address.street),
                  icon: Icons.signpost_outlined,
                ),
          address?.district == null || address!.district.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "District",
                  trailing: Text(address.district),
                  icon: Icons.area_chart_rounded,
                ),
          address?.state == null || address!.state.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "State",
                  trailing: Text(address.state),
                  icon: Icons.calendar_view_day_outlined,
                ),
          address?.postalCode == null || address!.postalCode.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "Postal Code",
                  trailing: Text(address.postalCode),
                  icon: Icons.local_post_office_outlined,
                ),
          //REQUIRED FIELDS, BUT FOR EXTRA SAFETY
          address?.city == null || address!.city.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "City",
                  trailing: Text(address.city),
                  icon: Icons.apartment,
                ),
          address?.country == null || address!.country.isEmpty
              ? const SizedBox()
              : InfoTile(
                  label: "Country",
                  trailing: Text(address.country),
                  icon: Icons.public,
                ),
        ],
      ),
    );
  }
}
