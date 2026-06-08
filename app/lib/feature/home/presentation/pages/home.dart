import 'package:app/core/navigation/shell_page_index_provider.dart';
import 'package:app/core/services/pk_storage.service.dart';
import 'package:app/core/utils/error_message.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/ui/loading.dart';
import 'package:app/feature/credentials/domain/models/credential_item.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_details.dart';
import 'package:app/feature/credentials/presentation/widgets/credential_icon.dart';
import 'package:app/feature/home/domain/home_data.dart';
import 'package:app/feature/home/presentation/providers/home_provider.dart';
import 'package:app/feature/home/presentation/widgets/activity_item.dart';
import 'package:app/feature/home/presentation/widgets/custom_horizontal_container.dart';
import 'package:app/feature/home/presentation/widgets/custom_vertical_container.dart';
import 'package:app/feature/home/presentation/widgets/custom_vertical_divider.dart';
import 'package:app/feature/home/presentation/widgets/notification_button.dart';
import 'package:app/feature/home/presentation/widgets/pk_setup_dialog.dart';
import 'package:app/feature/home/presentation/widgets/quick_action.dart';
import 'package:app/feature/home/presentation/widgets/stat_item.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/notifications/presentation/providers/notification_provider.dart';
import 'package:app/feature/notifications/presentation/widgets/notification_bottom_sheet.dart';
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

  @override
  void initState() {
    super.initState();
    pkCheckUp();
  }

  Future<void> pkCheckUp() async {
    final pk = await ref.read(pkStorageServiceProvider).getPK();
    if (pk != null) return;
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PkSetupDialog(
        onSave: () => showAlertDialog(
          context,
          "Private Key saved successfully",
          type: AlertType.success,
        ),
      ),
    );
  }

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

  void onTapShowNotifications() {
    showModalBottomSheet(
      useSafeArea: true,
      isScrollControlled: true,
      isDismissible: true,
      showDragHandle: true,
      context: context,
      builder: (ctx) => const NotificationsBottomSheet(),
    );
  }

  void onTapQR() {
    final shellPageIndexNotifier = ref.read(shellPageIndexProvider.notifier);
    shellPageIndexNotifier.state = 2;
  }

  @override
  Widget build(BuildContext context) {
    final homeDataAsync = ref.watch(homeDataProvider);
    final hasUnreadNotification = ref.watch(unreadCountProvider) > 0;

    return homeDataAsync.when(
      data: (data) => MainLayout(
        children: [
          _header(data, hasUnreadNotification),
          _userInfoContainer(context, data),
          const SizedBox(height: 20),
          _quickActions(),
          const SizedBox(height: 20),
          _recentActivities(data),
        ],
      ),
      error: (error, stackTrace) => Center(
        child: Text(errorMessage(error)),
      ),
      loading: () => const Center(
        child: LoadingState(),
      ),
    );
  }

  Padding _header(HomeData data, bool hasUnreadNotification) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.transparent,
                child: data.universityLogo != null
                    ? Padding(
                        padding: const EdgeInsets.all(6),
                        child: Image.network(
                          data.universityLogo!,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.school_outlined),
                        ),
                      )
                    : const Icon(Icons.school_outlined),
              ),
              const SizedBox(width: 12),
              Column(
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
            ],
          ),
          NotificationButton(
            hasUnread: hasUnreadNotification,
            onTap: () => onTapShowNotifications(),
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
                label: "QR",
                icon: Icons.qr_code_2_outlined,
                color: context.colors.primary,
                onTap: onTapQR,
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
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Text("Recent Activites", style: context.texts.titleLarge),
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
                    id: data.recentCredentials?[index].id ?? "",
                    isRevoked:
                        data.recentCredentials?[index].isRevoked ?? false,
                  ),
                ),
                title: data.recentCredentials?[index].title ?? "",
                subTitle: data.recentCredentials?[index].type.name ?? "",
                icon: CredentialIcon(
                    type: data.recentCredentials?[index].type ??
                        CredentialItemType.unknown),
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
