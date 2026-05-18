import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_details.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/home/domain/home_data.dart';
import 'package:app/feature/home/presentation/providers/home_provider.dart';
import 'package:app/feature/home/presentation/widgets/activity_item.dart';
import 'package:app/feature/home/presentation/widgets/credentials_bottom_sheet.dart';
import 'package:app/feature/home/presentation/widgets/custom_horizontal_container.dart';
import 'package:app/feature/home/presentation/widgets/custom_vertical_container.dart';
import 'package:app/feature/home/presentation/widgets/custom_vertical_divider.dart';
import 'package:app/feature/home/presentation/widgets/quick_action.dart';
import 'package:app/feature/home/presentation/widgets/stat_item.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/profile/presentation/widgets/custom_text_button.dart';
import 'package:app/feature/settings/presentation/pages/settings.dart';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});
  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  bool _isCopied = false;

  void onTapCopy(HomeData data) async {
    setState(() {
      _isCopied = true;
    });
    await Clipboard.setData(ClipboardData(text: data.walletAddress ?? ""));
    Future.delayed(
      Duration(seconds: 3),
      () {
        setState(() {
          _isCopied = false;
        });
      },
    );
  }

  void onTapSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => SettingsPage(),
      ),
    );
  }

  void onTapSeeAll(HomeData data) {
    showModalBottomSheet(
      useSafeArea: true,
      isScrollControlled: true,
      isDismissible: true,
      showDragHandle: true,
      context: context,
      builder: (ctx) => CredentialsBottomSheet(
        credentials: data.credentialsList ?? [],
      ),
    );
  }

  void onTapScan() {
    debugPrint("navigate to {scan} page");
  }

  void onTapGenerate() {
    debugPrint("navigate to {generate qr} page");
  }

  @override
  Widget build(BuildContext context) {
    final homeDataAsync = ref.watch(homeDataProvider);
    return homeDataAsync.when(
      data: (data) => MainLayout(
        children: [
          _header(data),
          _userInfoContainer(context, data),
          const SizedBox(height: 20),
          _quickActions(),
          const SizedBox(height: 20),
          _recentActivities(data),
        ],
      ),
      error: (error, stackTrace) => Center(
        child: Text(error.toString()),
      ),
      loading: () => Center(
        child: LoadingState(),
      ),
    );
  }

  Padding _header(HomeData data) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Welcome back,",
            style: context.texts.bodyLarge,
          ),
          Text(
            data.firstName ?? "",
            style: context.texts.displaySmall,
          ),
        ],
      ),
    );
  }

  CustomVerticalContainer _userInfoContainer(
      BuildContext context, HomeData data) {
    return CustomVerticalContainer(
      children: [
        _walletAddress(
          context,
          data,
        ),
        _rowStats(context, data),
      ],
    );
  }

  Column _quickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Quick Actions",
          style: context.texts.titleLarge,
        ),
        const SizedBox(height: 8),
        CustomHorizontalContainer(
          children: [
            Expanded(
              child: QuickAction(
                label: "Settings",
                icon: Icons.settings,
                color: context.colors.tertiary,
                onTap: onTapSettings,
              ),
            ),
            Expanded(
              child: QuickAction(
                label: "Scan",
                icon: Icons.document_scanner_outlined,
                color: context.colors.secondary,
                onTap: onTapScan,
              ),
            ),
            Expanded(
              child: QuickAction(
                label: "Generate",
                icon: Icons.qr_code_2_outlined,
                color: context.colors.primary,
                onTap: onTapGenerate,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Column _recentActivities(HomeData data) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("Recent Activites", style: context.texts.titleLarge),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: CustomTextButton(
                label: "See all",
                color: context.colors.primary,
                onTap: () => onTapSeeAll(data),
              ),
            )
          ],
        ),
        const SizedBox(height: 8),
        CustomVerticalContainer(
          children: List.generate(
            data.recentCredentials?.length ?? 0,
            (index) {
              return ActivityItem(
                onTap: () => showDialog(
                  context: context,
                  builder: (ctx) => CredentialDetailsDialog(
                      credential: data.recentCredentials?[index]),
                ),
                title: data.recentCredentials?[index].title ?? "",
                subTitle: data.recentCredentials?[index].issuerName ?? "",
                icon: CredentialIcon(
                    type: data.recentCredentials?[index].type ??
                        CredentialType.unknown),
              );
            },
          ),
        ),
      ],
    );
  }

  Padding _walletAddress(BuildContext context, HomeData data) {
    return Padding(
      padding: EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Wallet address",
            style: context.texts.bodyLarge,
            textAlign: TextAlign.start,
          ),
          _walletAddressField(context, data),
        ],
      ),
    );
  }

  Container _walletAddressField(BuildContext context, HomeData data) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.primaryContainer.withAlpha(180),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        title: data.walletAddress?.isEmpty ?? true
            ? const Text("")
            : Text(
                "${data.walletAddress!.substring(0, 8)}...${data.walletAddress!.substring(data.walletAddress!.length - 3)}",
                overflow: TextOverflow.ellipsis,
              ),
        trailing: IconButton(
          onPressed: _isCopied ? null : () => onTapCopy(data),
          icon: AnimatedSwitcher(
            duration: Duration(milliseconds: 250),
            transitionBuilder: (child, animation) => ScaleTransition(
              scale: animation,
              child: child,
            ),
            child: _isCopied
                ? Icon(
                    Icons.done_all_rounded,
                    key: ValueKey("done"),
                  )
                : Icon(
                    Icons.copy,
                    key: ValueKey("copy"),
                  ),
          ),
        ),
      ),
    );
  }

  Padding _rowStats(BuildContext context, HomeData data) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          StatItem(
            stat: data.credentialsCount?.toString() ?? "0",
            label: "Credentials",
            color: context.colors.tertiary,
          ),
          CustomVerticalDivider(),
          StatItem(
            stat: data.cgpa?.toStringAsFixed(2) ?? "0",
            label: "GPA",
            color: context.colors.secondary,
          ),
          CustomVerticalDivider(),
          StatItem(
            stat: data.enrollmentStatus?.capitalize ?? "",
            label: "Status",
            color: context.colors.primary,
          )
        ],
      ),
    );
  }
}
