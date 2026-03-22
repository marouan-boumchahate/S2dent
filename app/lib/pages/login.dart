import 'package:app/components/animation_wrapper.dart';
import 'package:app/components/app_layout.dart';
import 'package:app/components/auth_textfield.dart';
import 'package:app/components/primary_button.dart';
import 'package:app/components/secondary_button.dart';

import 'package:app/components/toggle_button.dart';
import 'package:app/config/app_config.dart';
import 'package:app/extensions/context_extensions.dart';
import 'package:app/pages/home.dart';
import 'package:app/providers/appkit_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_svg/svg.dart';
import 'package:reown_appkit/reown_appkit.dart'
    hide PrimaryButton, SecondaryButton;

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

enum LoginMethod { privateKey, mnemonic, metamask }

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _privateController = TextEditingController();
  final _mnemonicController = TextEditingController();
  LoginMethod method = LoginMethod.privateKey;
  bool isDark = true;

  late ReownAppKitModal _appKitModal;
  final _secureStorage = FlutterSecureStorage();
  bool isModalReady = false;

  @override
  void dispose() {
    _privateController.dispose();
    _mnemonicController.dispose();
    _appKitModal.onModalConnect.unsubscribe((_) {});
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _initMetaMask();
  }

  Future<void> _initMetaMask() async {
    debugPrint('=== PROJECT ID: "${AppConfig.projectId}" ===');
    try {
      _appKitModal = ReownAppKitModal(
          context: context,
          projectId: AppConfig.projectId,
          metadata: PairingMetadata(
            name: "S2dent",
            description: "Student Credentials Blockchain",
            url: "https://ousama-jd.vercel.app/", //fake for now TODO: change it
            redirect: const Redirect(
              native: "s2dent://",
              linkMode: false,
            ),
          ),
          includedWalletIds: {
            "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96"
          });

      _appKitModal.onModalConnect.subscribe(
        (event) async {
          final address = _appKitModal.session?.getAddress("eip155");
          if (address != null) {
            await _secureStorage.write(key: "publicKey", value: address);
            await _secureStorage.write(key: "loginMethod", value: "MetaMask");
            if (mounted) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => const HomePage(),
                ),
              );
            }
          }
        },
      );
      await _appKitModal.init();
      ref.read(appKitModalProvider.notifier).state = _appKitModal;
      if (mounted) {
        setState(() {
          isModalReady = true;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('Init failed: $e');
      debugPrint('Stack: $stackTrace');
    }
  }

  void onTapAuthenticate() {}
  void onTapGenerate() {}
  void onTapMetaMask() {
    _appKitModal.openModalView();
  }

  @override
  Widget build(BuildContext context) {
    final icon = Theme.brightnessOf(context) == Brightness.dark
        ? "assets/password.png"
        : "assets/password_light.png";
    return AppLayout(
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _headerSection(context, icon),
              _toggleButtons(),
              method == LoginMethod.metamask
                  ? _metamaskButton(context)
                  : _textField(),
              method != LoginMethod.metamask
                  ? PrimaryButton(
                      onTap: onTapAuthenticate,
                      label: "Authenticate",
                    )
                  : const SizedBox(),
              _dividerSection(context),
              SecondaryButton(
                  onTap: onTapGenerate, label: "Generate New Wallet"),
            ],
          ),
        ),
      ),
    );
  }

  AnimationWrapper _metamaskButton(BuildContext context) {
    return AnimationWrapper(
      widget: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Container(
          decoration: BoxDecoration(
            color: context.colors.primaryContainer,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: context.colors.inversePrimary),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "MetaMask",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Material(
                  color: context.colors.inversePrimary,
                  shape: CircleBorder(),
                  child: InkWell(
                    customBorder: CircleBorder(),
                    onTap: isModalReady ? onTapMetaMask : null,
                    child: Container(
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                          border: Border.all(
                            color: context.colors.primary,
                            width: 2,
                          ),
                          shape: BoxShape.circle),
                      child: SvgPicture.asset(
                        "assets/metamask.svg",
                        width: 62.2,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
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
            "Dont have wallet yet ?",
            style: TextStyle(
              color: context.colors.onSurface.withAlpha(150),
            ),
          )
        ],
      ),
    );
  }

  AnimationWrapper _textField() {
    return AnimationWrapper(
      widget: AuthTextfield(
        key: ValueKey(method),
        controller: method == LoginMethod.privateKey
            ? _privateController
            : _mnemonicController,
        label: method == LoginMethod.privateKey ? "Private Key" : "Mnemonic",
        hint:
            method == LoginMethod.privateKey ? "ab3cd35..." : "Horse, Apple...",
      ),
    );
  }

  Row _toggleButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: ToggleButton(
            onTap: () {
              setState(() {
                method = LoginMethod.privateKey;
              });
            },
            isSelected: method == LoginMethod.privateKey,
            child: Icon(Icons.key, size: 25),
          ),
        ),
        Expanded(
          child: ToggleButton(
            onTap: () {
              setState(() {
                method = LoginMethod.mnemonic;
              });
            },
            isSelected: method == LoginMethod.mnemonic,
            child: Icon(Icons.book, size: 25),
          ),
        ),
        Expanded(
          child: ToggleButton(
            onTap: () {
              setState(() {
                method = LoginMethod.metamask;
              });
            },
            isSelected: method == LoginMethod.metamask,
            child: SvgPicture.asset("assets/metamask.svg", width: 25),
          ),
        ),
      ],
    );
  }

  Container _headerSection(BuildContext context, String icon) {
    return Container(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        children: [
          Image.asset(
            icon,
            width: 150,
          ),
          Text(
            "Welcome Back",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 32,
                color: context.colors.onSurface),
          ),
          Text(
            "Choose your Sign-In method.",
            style: TextStyle(
              height: 2,
              color: context.colors.onSurface.withAlpha(200),
            ),
          ),
        ],
      ),
    );
  }
}
