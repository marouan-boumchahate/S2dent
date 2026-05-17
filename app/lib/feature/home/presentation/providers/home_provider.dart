import 'package:app/feature/credentials/presentation/providers/credential_provider.dart';
import 'package:app/feature/home/domain/home_data.dart';
import 'package:app/feature/profile/presentation/providers/profile_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final homeDataProvider = Provider<AsyncValue<HomeData>>(
  (ref) {
    final profileAsync = ref.watch(profileControllerProvider);
    final credentialAsync = ref.watch(credentialControllerProvider);

    return profileAsync.when(
      data: (profileData) => credentialAsync.when(
        data: (credentialData) => AsyncData(
          HomeData(
            cgpa: profileData.academic?.cgpa ?? 0,
            credentialsCount: credentialData.length,
            enrollmentStatus:
                profileData.academic?.enrollmentsStatus.name ?? "",
            firstName: profileData.user?.firstName ?? "",
            recentCredentials: credentialData.take(3).toList(),
            walletAddress: profileData.identity?.walletAddress ?? "",
            credentialsList: credentialData,
          ),
        ),
        error: (error, stackTrace) => AsyncError(error, stackTrace),
        loading: () => AsyncValue.loading(),
      ),
      error: (error, stackTrace) => AsyncValue.error(error, stackTrace),
      loading: () => AsyncValue.loading(),
    );
  },
);
