import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/app_color.dart';
import 'package:app/core/utils/date_formatter.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/domain/models/credential_payload.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_status_badge.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';

class CredentialDecryptedDetails extends StatelessWidget {
  const CredentialDecryptedDetails({
    super.key,
    required this.credential,
    required this.decryptedData,
    required this.isRevoked,
    required this.onBack,
  });

  final Credential credential;
  final Map<String, dynamic> decryptedData;
  final bool isRevoked;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
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
              CredentialStatusBadge(isRevoked: isRevoked),
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
        _payloadFields(),
        const SizedBox(height: 8),
        const Divider(thickness: 2),
        Center(
          child: OutlinedButton(
            onPressed: onBack,
            child: const Text("BACK"),
          ),
        ),
      ],
    );
  }

  Widget _payloadFields() {
    switch (credential.type) {
      case CredentialItemType.enrollment:
        final data = EnrollmentPayload.fromJson(decryptedData);
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
        final data = AttendancePayload.fromJson(decryptedData);
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
        final data = DegreePayload.fromJson(decryptedData);
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
        final data = CertificatePayload.fromJson(decryptedData);
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
        final data = AchievementPayload.fromJson(decryptedData);
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
        final data = TranscriptPayload.fromJson(decryptedData);
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
}
