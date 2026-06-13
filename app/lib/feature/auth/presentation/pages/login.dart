import 'package:app/core/config/app_config.dart';
import 'package:app/core/extensions/context_extensions.dart';
import 'package:app/core/theme/theme_provider.dart';
import 'package:app/feature/auth/presentation/providers/appkit_provider.dart';
import 'package:app/core/utils/error_message.dart';
import 'package:app/core/utils/show_alert_dialog.dart';
import 'package:app/core/widgets/ui/buttons/primary_button.dart';
import 'package:app/core/widgets/ui/error_view.dart';
import 'package:app/feature/auth/presentation/pages/verify_email.dart';
import 'package:app/feature/auth/presentation/providers/auth_provider.dart';
import 'package:app/feature/auth/presentation/widgets/auth_layout.dart';
import 'package:app/feature/auth/presentation/widgets/secondary_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:reown_appkit/reown_appkit.dart'
    hide PrimaryButton, SecondaryButton;

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  bool isDark = true;
  Object? _initError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initAppKit());
  }

  Future<void> _initAppKit() async {
    if (_initError != null) setState(() => _initError = null);
    try {
      final modal = ReownAppKitModal(
        context: context,
        projectId: AppConfig.projectId,
        metadata: const PairingMetadata(
          name: 'S2dent',
          description: 'Student Identity Wallet',
          url: 'https://s2dent.app',
          icons: ['https://s2dent.app/icon.png'],
          redirect: Redirect(
            native: 's2dent://',
          ),
        ),
        includedWalletIds: const {
          //metamask wallet id only
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
        },
      );
      await modal.init();
      if (modal.isConnected) {
        await modal.disconnect();
      }
      if (mounted) {
        ref.read(appKitModalProvider.notifier).state = modal;
      }
    } catch (e) {
      //reownappkit init failed (no network / relay unreachable / bad projectId)
      //surface it and let the user retry instead of leaving the buttons stuck
      if (mounted) setState(() => _initError = e);
    }
  }

  void onTapVerify() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerifyEmailPage(),
      ),
    );
  }

  void onTapSignIn() {
    ref.read(authControllerProvider.notifier).signIn();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isModalReady = ref.watch(appKitModalProvider) != null;

    ref.listen(authControllerProvider, (previous, next) {
      next.whenOrNull(
        error: (error, stackTrace) {
          showAlertDialog(context, errorMessage(error), type: AlertType.error);
        },
      );
    });

    final icon = ref.watch(logoImageProvider);
    return AuthLayout(
      children: [
        _headerSection(context, icon),
        _actions(context, authState.isLoading, isModalReady),
      ],
    );
  }

  Widget _actions(BuildContext context, bool isLoading, bool isModalReady) {
    if (_initError != null) {
      return ErrorView(error: _initError!, onTapRetry: _initAppKit);
    }
    final isDisabled = !isModalReady || isLoading;
    return Column(
      children: [
        PrimaryButton(
          onTap: isDisabled ? null : onTapSignIn,
          label: "SIGN IN WITH A WALLET",
          isEnable: !isDisabled,
          isLoading: !isModalReady,
        ),
        _dividerSection(context),
        SecondaryButton(
          onTap: isModalReady ? onTapVerify : null,
          label: "Verify Identity",
          isDisabled: !isModalReady,
        ),
      ],
    );
  }

  Padding _dividerSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsGeometry.symmetric(vertical: 12),
      child: Column(
        children: [
          Divider(
            color: context.colors.onSurfaceVariant.withAlpha(120),
            thickness: 1,
            endIndent: 12,
          ),
          Text(
            "New student ?",
            style: context.texts.bodyMedium!.copyWith(
              color: context.colors.onSurface.withAlpha(150),
            ),
          )
        ],
      ),
    );
  }

  Container _headerSection(BuildContext context, String icon) {
    return Container(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        children: [
          Image.asset(
            icon,
            width: 140,
          ),
          Text(
            "Welcome Back",
            style: context.texts.headlineLarge!.copyWith(
              fontWeight: FontWeight.bold,
              color: context.colors.onSurface,
            ),
          ),
          Text(
            "Sign in to your student wallet",
            style: context.texts.bodyMedium!.copyWith(
              height: 2,
              color: context.colors.onSurface.withAlpha(200),
            ),
          ),
          _infoBox(context),
        ],
      ),
    );
  }

  Padding _infoBox(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.colors.primary),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: context.colors.primary),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(
                  "Unverified students cannot sign in until they verify their identity",
                  overflow: TextOverflow.clip,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
