import 'package:app/core/widgets/activity_item.dart';
import 'package:app/core/widgets/containers/custom_horizontal_container.dart';
import 'package:app/core/widgets/containers/custom_vertical_container.dart';
import 'package:app/core/widgets/custom_vertical_divider.dart';
import 'package:app/core/widgets/layouts/main_layout.dart';
import 'package:app/core/widgets/buttons/quick_action.dart';
import 'package:app/core/widgets/stat_item.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/feature/profile/presentation/pages/profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});
  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final String dummyAddress = "0x4f2aB8Af89539nBBFe73983BfUUBbbDBbBBDD76S86390";
  bool isCopied = false;

  final List<Map<String, dynamic>> dummyActivites = [
    {
      "title": "Bachelor of CE",
      "subTitle": "Fenerbahce University",
      "icon": Icons.description_outlined,
      "isCredential": true,
    },
    {
      "title": "Attendence List Scanned",
      "subTitle": "By a verifier",
      "icon": Icons.qr_code_rounded,
      "isCredential": false,
    },
    {
      "title": "Identity Issued",
      "subTitle": "By FBU",
      "icon": Icons.create,
      "isCredential": true,
    }
  ];

  void onTapCopy() async {
    setState(() {
      isCopied = true;
    });
    await Clipboard.setData(ClipboardData(text: dummyAddress));
    Future.delayed(
      Duration(seconds: 3),
      () {
        setState(() {
          isCopied = false;
        });
      },
    );
  }

  void onTapSeeAll() {
    debugPrint("navigate to {see all} page");
  }

  void onTapCredentials() {
    debugPrint("navigate to {credentials} page");
    //dummy navigation
    Navigator.push(context, MaterialPageRoute(builder: (ctx) => ProfilePage()));
  }

  void onTapScan() {
    debugPrint("navigate to {scan} page");
  }

  void onTapGenerate() {
    debugPrint("navigate to {generate qr} page");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colors.onPrimary,
      body: MainLayout(
        children: [
          _header(),
          _userInfoContainer(context),
          const SizedBox(height: 20),
          _quickActions(),
          const SizedBox(height: 20),
          _recentActivities(),
        ],
      ),
    );
  }

  Padding _header() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Welcome back,",
            style: TextStyle(fontSize: 16),
          ),
          Text(
            "Ousama",
            style: TextStyle(fontSize: 40),
          ),
        ],
      ),
    );
  }

  CustomVerticalContainer _userInfoContainer(BuildContext context) {
    return CustomVerticalContainer(
      children: [
        _walletAddress(context),
        _rowStats(context),
      ],
    );
  }

  Column _quickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Quick Actions",
          style: TextStyle(fontSize: 20),
        ),
        const SizedBox(height: 8),
        CustomHorizontalContainer(
          children: [
            Expanded(
              child: QuickAction(
                label: "Credentials",
                icon: Icons.description_outlined,
                color: context.colors.tertiary,
                onTap: onTapCredentials,
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

  Column _recentActivities() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("Recent Activites", style: TextStyle(fontSize: 20)),
            TextButton(onPressed: onTapSeeAll, child: Text("See All"))
          ],
        ),
        CustomVerticalContainer(
          children: List.generate(
            dummyActivites.length,
            (index) {
              return ActivityItem(
                title: dummyActivites[index]["title"],
                subTitle: dummyActivites[index]["subTitle"],
                icon: dummyActivites[index]["icon"],
                isCredential: dummyActivites[index]["isCredential"],
              );
            },
          ),
        ),
      ],
    );
  }

  Padding _walletAddress(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Wallet address",
            style: TextStyle(fontSize: 16),
            textAlign: TextAlign.start,
          ),
          _walletAddressField(context),
        ],
      ),
    );
  }

  Container _walletAddressField(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.primaryContainer.withAlpha(180),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        title: Text(
          "${dummyAddress.substring(0, 8)}...${dummyAddress.substring(dummyAddress.length - 3)}",
          overflow: TextOverflow.ellipsis,
        ),
        trailing: IconButton(
          onPressed: isCopied ? null : onTapCopy,
          icon: AnimatedSwitcher(
            duration: Duration(milliseconds: 250),
            transitionBuilder: (child, animation) => ScaleTransition(
              scale: animation,
              child: child,
            ),
            child: isCopied
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

  Padding _rowStats(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          StatItem(
            stat: "5",
            label: "Credentials",
            color: context.colors.tertiary,
          ),
          CustomVerticalDivider(),
          StatItem(
            stat: "4.0",
            label: "GPA",
            color: context.colors.secondary,
          ),
          CustomVerticalDivider(),
          StatItem(
            stat: "Active",
            label: "Status",
            color: context.colors.primary,
          )
        ],
      ),
    );
  }
}
