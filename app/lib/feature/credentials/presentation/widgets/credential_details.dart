import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/services/pk_storage.service.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/core/utils/dimensions.dart';
import 'package:app/core/utils/ecies_decrypt.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/domain/models/credential_payload.dart';
import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_status_badge.dart';
import 'package:app/feature/home/presentation/widgets/pk_setup_dialog.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

class CredentialDetailsDialog extends ConsumerStatefulWidget {
  const CredentialDetailsDialog({
    super.key,
    required this.id,
    required this.isRevoked,
  });

  final String id;
  final bool isRevoked;

  @override
  ConsumerState<CredentialDetailsDialog> createState() =>
      _CredentialDetailsDialogState();
}

class _CredentialDetailsDialogState
    extends ConsumerState<CredentialDetailsDialog> {
  bool _isDecrypting = false;
  Map<String, dynamic>? _decryptedData;
  Future<void> _onTapDecrypt(String encryptedPayload) async {
    setState(() {
      _isDecrypting = true;
    });

    final pk = await ref.read(pkStorageServiceProvider).getPK();
    if (pk == null) {
      setState(() {
        _isDecrypting = false;
      });
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => PkSetupDialog(
          onSave: () => showAlertDialog(
            context,
            "Private Key Saved Successfully",
            type: AlertType.success,
          ),
        ),
      );
      return;
    }
    try {
      final data = eciesDecrypt(encryptedPayload, pk);
      setState(() {
        _decryptedData = data;
        _isDecrypting = false;
      });
    } catch (e) {
      setState(() => _isDecrypting = false);
      if (!mounted) return;
      showAlertDialog(context, e.toString(), type: AlertType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(credentialDetailProvider(widget.id));

    return Dialog(
      child: Container(
        padding: const EdgeInsets.all(16),
        width: widthConstraints(context),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: detailAsync.when(
          data: (credential) => AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _decryptedData != null
                ? _decryptedContent(context, credential)
                : _content(context, credential),
          ),
          loading: () => const SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, stackTrace) => const Padding(
            padding: EdgeInsets.all(16),
            child: Text("Failed to load credential"),
          ),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, Credential credential) {
    return Column(
      key: const ValueKey("details"),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          margin: EdgeInsets.only(bottom: 8),
          width: double.infinity,
          child: Row(
            children: [
              CredentialIcon(type: credential.type),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      credential.title,
                      style: context.texts.titleMedium!.copyWith(
                        color: context.colors.onSurface,
                      ),
                    ),
                    Text(
                      credential.type.name.capitalize,
                      style: context.texts.titleSmall!.copyWith(
                        color: context.colors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              CredentialStatusBadge(isRevoked: widget.isRevoked),
            ],
          ),
        ),
        const Divider(
          thickness: 2,
        ),
        Text(
          "Issuance Details",
          style: context.texts.titleMedium!.copyWith(
            color: context.colors.tertiary,
          ),
        ),
        const SizedBox(height: 8),
        _credentialInfoTile(
          context,
          "assets/icons/issuer.svg",
          "Issuer",
          credential.issuerAddress,
        ),
        _credentialInfoTile(
          context,
          "assets/icons/person.svg",
          "Issued to",
          credential.studentAddress,
        ),
        _credentialInfoTile(
          context,
          "assets/icons/issued_at.svg",
          "Issued at",
          dateFormatter(credential.issuedAt),
        ),
        if (widget.isRevoked)
          _credentialInfoTile(
            context,
            "assets/icons/expires_at.svg",
            "Revocation reason",
            credential.revocationReason ?? "",
          ),
        const Divider(
          thickness: 2,
        ),
        Text(
          "Description",
          style: context.texts.titleMedium!.copyWith(
            color: context.colors.tertiary,
          ),
        ),
        const SizedBox(height: 8),
        Text(credential.description ?? "No description provided"),
        const SizedBox(height: 8),
        const Divider(
          thickness: 2,
        ),
        Center(
          child: OutlinedButton(
            onPressed: _isDecrypting
                ? null
                : () => _onTapDecrypt(credential.encryptedPayload),
            child: _isDecrypting
                ? const SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(),
                  )
                : Text("DECRYPT"),
          ),
        )
      ],
    );
  }

  Widget _decryptedContent(BuildContext context, Credential credential) {
    return Column(
      key: const ValueKey("decrypted"),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          margin: const EdgeInsets.only(bottom: 8),
          width: double.infinity,
          child: Row(
            children: [
              CredentialIcon(type: credential.type),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      credential.title,
                      style: context.texts.titleMedium!.copyWith(
                        color: context.colors.onSurface,
                      ),
                    ),
                    Text(
                      credential.type.name.capitalize,
                      style: context.texts.titleSmall!.copyWith(
                        color: context.colors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              CredentialStatusBadge(isRevoked: widget.isRevoked),
            ],
          ),
        ),
        const Divider(thickness: 2),
        Text(
          "Decrypted Payload",
          style: context.texts.titleMedium!.copyWith(
            color: context.colors.tertiary,
          ),
        ),
        const SizedBox(height: 8),
        _payloadFields(credential),
        const SizedBox(height: 8),
        const Divider(thickness: 2),
        Center(
          child: OutlinedButton(
            onPressed: () => setState(() => _decryptedData = null),
            child: const Text("BACK"),
          ),
        ),
      ],
    );
  }

  Widget _payloadFields(Credential credential) {
    switch (credential.type) {
      case CredentialItemType.enrollment:
        final data = EnrollmentPayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Course", data.courseName),
          _payloadInfoTile("Course Code", data.courseCode),
          _payloadInfoTile("Academic Year", data.academicYear),
          _payloadInfoTile("Semester", data.semester),
          if (data.enrollmentDate != null)
            _payloadInfoTile(
                "Enrollment Date", dateFormatter(data.enrollmentDate)),
        ]);
      case CredentialItemType.attendance:
        final data = AttendancePayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Course", data.courseName),
          _payloadInfoTile("Course Code", data.courseCode),
          _payloadInfoTile("Academic Year", data.academicYear),
          _payloadInfoTile("Semester", data.semester),
          _payloadInfoTile("Total Sessions", data.totalSessions.toString()),
          _payloadInfoTile("Attended", data.attendedSessions.toString()),
          _payloadInfoTile("Excused Absences", data.excusedAbsences.toString()),
          if (data.periodFrom != null)
            _payloadInfoTile("From", dateFormatter(data.periodFrom)),
          if (data.periodTo != null)
            _payloadInfoTile("To", dateFormatter(data.periodTo)),
        ]);
      case CredentialItemType.degree:
        final data = DegreePayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Degree", data.degreeTitle),
          _payloadInfoTile("Level", data.degreeLevel),
          _payloadInfoTile("Major", data.major),
          _payloadInfoTile("Program Code", data.programCode),
          _payloadInfoTile("Faculty", data.faculty),
          _payloadInfoTile("Department", data.department),
          if (data.graduationDate != null)
            _payloadInfoTile(
                "Graduation Date", dateFormatter(data.graduationDate)),
          _payloadInfoTile("GPA", "${data.gpa} / ${data.gpaScale}"),
          _payloadInfoTile(
              "Class Rank", "${data.classRank} / ${data.classSize}"),
          if (data.honors != null) _payloadInfoTile("Honors", data.honors!),
          _payloadInfoTile("Credits Earned",
              "${data.totalCreditsEarned} / ${data.requiredCredits}"),
        ]);
      case CredentialItemType.certificate:
        final data = CertificatePayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Certificate", data.certificateName),
          _payloadInfoTile("Code", data.certificateCode),
          _payloadInfoTile("Category", data.certificateCategory),
          _payloadInfoTile("Duration", "${data.programDurationHours}h"),
          _payloadInfoTile("Delivery", data.deliveryMode),
          if (data.startDate != null)
            _payloadInfoTile("Start Date", dateFormatter(data.startDate)),
          if (data.endDate != null)
            _payloadInfoTile("End Date", dateFormatter(data.endDate)),
          _payloadInfoTile(
              "Score", "${data.finalScore} / ${data.passingScore}"),
          _payloadInfoTile("Instructor", data.instructorName),
        ]);
      case CredentialItemType.achievement:
        final data = AchievementPayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Achievement", data.achievementTitle),
          _payloadInfoTile("Type", data.achievementType),
          _payloadInfoTile("Event", data.eventName),
          _payloadInfoTile("Event Type", data.eventType),
          _payloadInfoTile("Organizer", data.eventOrganizer),
          if (data.eventDate != null)
            _payloadInfoTile("Date", dateFormatter(data.eventDate)),
          _payloadInfoTile("Location", data.eventLocation),
          if (data.score != null)
            _payloadInfoTile("Score", data.score.toString()),
          if (data.placement != null)
            _payloadInfoTile("Placement", "#${data.placement}"),
          if (data.teamName != null) _payloadInfoTile("Team", data.teamName!),
          if (data.projectTitle != null)
            _payloadInfoTile("Project", data.projectTitle!),
          if (data.projectDescription != null)
            _payloadInfoTile("Description", data.projectDescription!),
        ]);
      case CredentialItemType.transcript:
        final data = TranscriptPayload.fromJson(_decryptedData!);
        return Column(children: [
          _payloadInfoTile("Program", data.programName),
          _payloadInfoTile("Degree Level", data.degreeLevel),
          _payloadInfoTile("Academic Year",
              "${data.academicYearFrom} – ${data.academicYearTo}"),
          _payloadInfoTile(
              "Cumulative GPA", "${data.cumulativeGpa} / ${data.gpaScale}"),
          _payloadInfoTile(
              "Credits Attempted", data.totalCreditsAttempted.toString()),
          _payloadInfoTile(
              "Credits Earned", data.totalCreditsEarned.toString()),
        ]);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _payloadInfoTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
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

  Widget _credentialInfoTile(
    BuildContext context,
    String asset,
    String title,
    String trailing,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Row(
              children: [
                SvgPicture.asset(
                  asset,
                  colorFilter: ColorFilter.mode(
                    AppColors.textMuted,
                    BlendMode.srcIn,
                  ),
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    title,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              trailing,
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
