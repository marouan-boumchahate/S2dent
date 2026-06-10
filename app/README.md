# S2dent Mobile Application (Flutter)

S2dent is the mobile client for a blockchain-based student identity system. Students use it to connect their crypto wallet, get issued a verifiable identity, view their credentials, and share them via QR codes. Verifiers (employers, institutions) scan those QR codes to instantly verify a student's credentials on-chain, no paperwork needed.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Project Structure](#project-structure)
6. [Architecture](#architecture)
7. [4.5 Mobile Application Implementation (Flutter)](#45-mobile-application-implementation-flutter)
   - [4.5.1 Project Structure (Flutter)](#451-project-structure-flutter)
   - [4.5.2 State Management with Riverpod](#452-state-management-with-riverpod)
   - [4.5.3 Wallet Integration with Reown AppKit](#453-wallet-integration-with-reown-appkit)
   - [4.5.4 Identity View Screen](#454-identity-view-screen)
   - [4.5.5 Credential View Screen](#455-credential-view-screen)
   - [4.5.6 QR Code Scanner](#456-qr-code-scanner)
   - [4.5.7 Secure Storage on Device](#457-secure-storage-on-device)
   - [4.5.8 Real-Time Sync with Socket.io](#458-real-time-sync-with-socketio)
8. [Feature Breakdown](#feature-breakdown)
   - [Authentication](#authentication)
   - [Student Verification (New Students)](#student-verification-new-students)
   - [Home Dashboard](#home-dashboard)
   - [Credentials](#credentials)
   - [QR Code](#qr-code)
   - [Profile](#profile)
   - [Notifications](#notifications)
   - [Settings](#settings)
9. [Networking & API Layer](#networking--api-layer)
10. [Cryptography](#cryptography)
11. [Theme System](#theme-system)
12. [Navigation](#navigation)
13. [Running the App](#running-the-app)

---

## Overview

The app is the student-facing mobile interface for S2dent. It does a few core things:

- lets students connect their MetaMask wallet and authenticate with it
- shows the student their issued blockchain identity and all their credentials
- lets them generate signed QR codes for verifiers to scan and check their credentials
- keeps them updated in real-time via Socket.IO whenever their credentials change
- keeps all sensitive data (tokens, private key) encrypted on-device

The app follows clean architecture with Riverpod as the state management solution. Every feature is self-contained in its own folder with its own domain models, data layer, and presentation layer.

---

## Tech Stack

| Area | Package | Version |
|---|---|---|
| State Management | `flutter_riverpod` | ^3.3.1 |
| HTTP Client | `dio` | ^5.9.2 |
| WebSocket / Real-time | `socket_io_client` | ^3.1.4 |
| Wallet Integration | `reown_appkit` | ^1.8.3 |
| Secure Storage | `flutter_secure_storage` | ^9.2.4 |
| QR Scanner | `mobile_scanner` | ^7.2.0 |
| QR Generator | `qr_flutter` | ^4.1.0 |
| Cryptography | `pointycastle` | ^4.0.0 |
| OTP Input | `pinput` | ^6.0.2 |
| Theme | `flex_color_scheme` | ^8.4.0 |
| Fonts | `google_fonts` | ^8.0.2 |
| Animations | `lottie` | ^3.3.3 |
| Image Picker | `image_picker` | ^1.1.2 |
| Phone Field | `intl_phone_field` | ^3.2.0 |
| Persistence | `shared_preferences` | ^2.5.5 |
| Hex Encoding | `hex` | ^0.2.0 |

Flutter SDK requirement: `>=3.6.0 <4.0.0`

---

## Getting Started

Make sure Flutter is installed and working. Then:

```bash
# install dependencies
flutter pub get

# run with mock API (no backend needed)
flutter run --dart-define=USE_MOCK_API=true

# run against real backend
flutter run \
  --dart-define=API_URL=http://your-backend-url/api \
  --dart-define=PROJECT_ID=your_reown_project_id
```

For production build:

```bash
flutter build apk \
  --dart-define=API_URL=https://your-api.com/api \
  --dart-define=PROJECT_ID=your_project_id
```

---

## Environment Variables

All config comes via `--dart-define` at build/run time. There are no `.env` files. The values are read in `lib/core/config/app_config.dart`:

| Variable | Description | Required |
|---|---|---|
| `API_URL` | Base URL of the backend API (e.g. `http://localhost:3000/api`) | yes |
| `PROJECT_ID` | Reown AppKit project ID for wallet connection | yes |
| `USE_MOCK_API` | Set to `true` to bypass the real API and use mocked responses | no |

When `USE_MOCK_API=true`, the mock interceptor kicks in and returns fake responses for all API calls, so the app runs without needing a backend at all. Good for UI development.

---

## Project Structure

```
lib/
├── main.dart                    # App entry point
├── core/                        # Shared code used across features
│   ├── config/                  # Environment config (AppConfig)
│   ├── extensions/              # Context extensions (colors, text styles)
│   ├── navigation/              # Shell page, navigator key, page index
│   ├── network/                 # Dio setup, auth interceptor, mock interceptor
│   ├── services/                # Token storage, private key storage, media upload
│   ├── theme/                   # Light/dark themes via FlexColorScheme
│   ├── utils/                   # EIP-712 signing, ECIES decryption, dialogs, helpers
│   └── widgets/                 # Shared UI widgets (buttons, layouts, loading, nav)
└── feature/                     # One folder per feature
    ├── auth/                    # Wallet sign-in, OTP email verification
    ├── credentials/             # View, filter, decrypt credentials
    ├── home/                    # Dashboard with stats and recent activity
    ├── notifications/           # Socket.IO real-time notification system
    ├── profile/                 # Student profile view and editing
    ├── qr/                      # QR scanning and generation with EIP-712
    ├── role_selection/          # Initial screen to choose Student or Verifier
    └── settings/                # Theme toggle, FAQs, security info
```

Each feature folder follows the same pattern:

```
feature/<name>/
├── data/
│   ├── datasources/     # Raw API calls (Dio, Socket.IO)
│   └── repos_impl/      # Repository implementations
├── domain/
│   ├── models/          # Data models
│   └── repos/           # Repository interfaces (abstract)
└── presentation/
    ├── pages/           # Full screens
    ├── providers/       # Riverpod state notifiers and providers
    └── widgets/         # Feature-specific UI widgets
```

---

## Architecture

The app uses clean architecture, split into three layers:

**Domain layer:** pure Dart. Models and repository interfaces. No Flutter, no Dio, nothing external. This is the source of truth for data shape and what operations exist.

**Data layer:** implements the domain interfaces. Datasources make the actual HTTP/WebSocket calls. Repository implementations call the datasources and map the raw JSON to domain models.

**Presentation layer:** Flutter widgets and Riverpod providers. Providers instantiate repository implementations, hold state, and expose it to the UI. Widgets watch providers and rebuild when state changes.

```
UI (widgets) → watch → Providers → call → Repos → call → Datasources → HTTP/Socket
```

Dependency injection happens through Riverpod. No service locator, no manual wiring. Providers declare their dependencies using `ref.watch()`, and Riverpod handles the graph automatically.

---

## 4.5 Mobile Application Implementation (Flutter)

### 4.5.1 Project Structure (Flutter)

The app is organized into two top-level directories inside `lib/`: `core/` and `feature/`.

**`core/`** contains everything that's shared across the whole app: the theme system, the Dio HTTP client, auth interceptors, secure storage services, cryptography utilities, shared widgets (buttons, layouts, loading animations), and navigation setup. Nothing in `core/` depends on any specific feature.

**`feature/`** contains one subfolder per feature: `auth`, `credentials`, `home`, `notifications`, `profile`, `qr`, `role_selection`, and `settings`. Each feature is a self-contained vertical slice, it has its own models, its own API datasource, its own Riverpod providers, and its own screens and widgets. Features can depend on `core/` but not on each other (with minimal exceptions like `auth` connecting the notification socket on login).

Inside each feature, the three clean architecture layers are separated into `data/`, `domain/`, and `presentation/` subfolders. This makes it easy to swap out the data layer (e.g., use a different API endpoint format) without touching any UI code, and it makes the domain models the stable contract between layers.

The shell of the app (`core/navigation/shell_page.dart`) uses an `IndexedStack` to keep all four main pages alive simultaneously: Home, Credentials, QR, Profile. Switching tabs is instant because the pages are never destroyed. Navigation between screens within a feature uses standard `MaterialPageRoute` pushes.

---

### 4.5.2 State Management with Riverpod

The app uses **Riverpod 3** (`flutter_riverpod: ^3.3.1`) as the state management solution. Every piece of shared state lives in a Riverpod provider.

**Why Riverpod?** It gives compile-time safety for providers, supports async state out of the box via `AsyncValue`, and makes dependency injection clean, providers declare their dependencies explicitly using `ref.watch()`. No `BuildContext` needed to read state from anywhere.

**How providers are structured:**

Simple derived values use `Provider`:
```dart
final hasSessionProvider = Provider<AsyncValue<bool>>((ref) {
  return ref.watch(authControllerProvider).whenData((token) => token != null);
});
```

Async data (API calls) that the UI needs to display uses `FutureProvider`:
```dart
final homeDataProvider = FutureProvider.autoDispose<HomeData>((ref) async {
  // ... fetch and combine profile + credentials
});
```

Mutable state that needs methods (login, logout, refresh) uses `StateNotifier`:
```dart
class AuthController extends StateNotifier<AsyncValue<AuthToken?>> {
  Future<void> signIn() async { ... }
  Future<void> logout() async { ... }
  Future<void> refreshToken() async { ... }
}
```

**`AsyncValue<T>`** is used everywhere for UI state. It has three states (loading, data, and error) and the UI handles all three with a single `.when()` call:
```dart
session.when(
  data: (hasSession) => hasSession ? ShellPage() : RoleSelectionPage(),
  loading: () => LoadingState(),
  error: (e, _) => ErrorText(),
)
```

**Provider scope and lifecycle:** The `ProviderScope` wraps the whole app at the top level in `main.dart`. The initial theme is passed as an override so it loads from `SharedPreferences` before the first frame. Most providers are global and alive for the whole app lifecycle. Some credential and profile providers use `autoDispose` so they clean up when no widget is watching them.

**Cross-provider communication:** Providers can read other providers. For example, when the user logs in successfully, `AuthController` calls `ref.read(notificationRepoProvider).connect(accessToken)` to start the Socket.IO connection. When they log out, it calls `ref.read(notificationControllerProvider.notifier).clear()` to clean up. This wiring is done inside the provider factory function.

**Session expiry:** There's a dedicated `sessionExpiredProvider` (a `StateProvider<bool>`). The auth interceptor sets it to `true` when a token refresh fails. `AuthController` listens to this provider and triggers logout automatically.

---

### 4.5.3 Wallet Integration with Reown AppKit

Student authentication is entirely wallet-based, no username, no password. The student connects their MetaMask wallet and signs a server-issued nonce to prove ownership of the wallet address.

**The library used is `reown_appkit: ^1.8.3`** (formerly known as WalletConnect AppKit). It handles the wallet connection UI, session management, and the communication protocol between the app and the wallet app.

**Initialization:** On the login screen, `ReownAppKitModal` is initialized with:
- The `PROJECT_ID` (obtained from Reown's dashboard)
- App metadata (name, description, icon URL, deep link redirect)
- A filter to only allow MetaMask by its wallet ID

```dart
final modal = ReownAppKitModal(
  context: context,
  projectId: AppConfig.projectId,
  metadata: const PairingMetadata(
    name: 'S2dent',
    description: 'Student Identity Wallet',
    url: 'https://s2dent.app',
    icons: ['https://s2dent.app/icon.png'],
    redirect: Redirect(native: 's2dent://'),
  ),
  includedWalletIds: {
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
  },
);
await modal.init();
```

**Sign-in flow:**

1. Student taps "Sign in with a Wallet"
2. If wallet is not connected, `modal.openModalView()` opens the AppKit bottom sheet showing MetaMask
3. Student approves the connection in MetaMask
4. The app gets the student's Ethereum address from the session
5. App calls the backend to get a nonce (a random challenge string)
6. App sends a `personal_sign` request to MetaMask via the WalletConnect session
7. MetaMask shows the nonce to the student and asks them to sign it
8. The signature comes back to the app
9. App sends the address + signature to the backend for verification
10. Backend validates the signature, confirms the address owns the private key, and returns JWT tokens
11. Tokens are saved to `FlutterSecureStorage`. Session is established. App navigates to the main shell.

If the student closes MetaMask without signing, the modal is disconnected and the state resets silently (no error shown). If something else fails, the error is shown via `showAlertDialog`.

`[SCREENSHOT]` Wallet connection screen.

---

### 4.5.4 Identity View Screen

The identity is shown on the **Profile** tab. At the top of the profile screen is the student's name, photo (if uploaded), and student number. Below that are multiple sections:

- **Personal info:** full name, date of birth, gender, nationality, national ID, email, phone number
- **Academic info:** student number, current level, enrollment status, enrollment and expected graduation dates, CGPA, academic advisor name
- **Address info:** street, district, city, state, country, postal code
- **University info:** pulled from the student's linked university record
- **Identity section:** wallet address, issuance date, revocation status

The identity section specifically shows whether the student has an issued blockchain identity, when it was issued, and whether it has been revoked. This is the link between the student's academic record and their blockchain wallet.

All profile data is loaded by `ProfileController`, which calls six different API datasources in parallel and merges the results into a single `Student` model:

| Datasource | What it fetches |
|---|---|
| `UserDatasource` | Personal info (name, DOB, gender, etc.) |
| `AcademicDatasource` | Academic record (CGPA, level, status) |
| `AddressDatasource` | Address details |
| `DepartmentDatasource` | Department and faculty |
| `IdentityDatasource` | Wallet address and issuance status |
| `UniversityDatasource` | University name, logo, contact |

The profile supports editing personal and address info. When the student saves changes, the app uploads any new photo to the media service first, then sends the update to the backend.

`[SCREENSHOT]` Student identity card screen.

---

### 4.5.5 Credential View Screen

The **Credentials** tab shows all credentials issued to the student. Each credential is shown as a card with:

- Credential title and code
- Type (e.g., academic, extracurricular)
- Issue date
- A revoked badge if the credential has been revoked

**Loading:** `CredentialController` fetches the credential list from the API. Full credential details are fetched on demand (when the student taps a card) and cached so they don't get re-fetched on repeat opens.

**Filtering and sorting:** A filter bottom sheet lets students filter by type and sort by date or title.

**Viewing full details:** Tapping a credential opens a bottom sheet (`CredentialDetails`) that shows:

- Metadata (title, code, type, issued date)
- Student info embedded in the credential
- Blockchain data (transaction hash, block number, contract address)
- EIP-712 signature schema used for signing
- Verification signatures (issuer signature + student countersignature)
- The encrypted credential payload

**Decryption:** If the student has their private key saved on device, they can tap to decrypt the payload. The app uses ECIES decryption (ephemeral public key + AES-256-GCM) to decrypt the credential payload client-side. The decrypted content is shown in a separate section. The private key never leaves the device, decryption happens fully offline.

`[SCREENSHOT]` Credential list screen.

---

### 4.5.6 QR Code Scanner

The **QR** tab gives students two options: Scan or Generate.

**Scanning (for verifiers or students checking another student):**

The scanner uses `mobile_scanner: ^7.2.0` which accesses the device camera. A custom overlay (`ScannerCorners`) draws the corner brackets typical of QR scanner UIs. When a QR code is detected, the scanner stops automatically.

The scanned QR contains a signed verifier token. The app sends this token to the backend verification endpoint. The backend checks the signature, validates the credential on-chain, and returns a verification result. The result screen shows:

- Student name and photo
- Credential title and metadata
- Blockchain verification status (valid / revoked / not found)
- Transaction hash and block info
- Both signatures (issuer + student)

**Generating (for students to share their credentials):**

The student first picks which credential to share (`QRCredentialPicker`). Then picks how long the QR should be valid (via a duration picker bottom sheet with options like 1 minute, 5 minutes, 30 minutes, 1 hour).

`QrController` then:
1. Fetches the EIP-712 schema from the backend for that credential
2. Signs the schema using the student's private key (stored on-device) via the `signEIP712()` utility
3. Sends the signed data to the backend to get a short-lived verifier token
4. That token is encoded as a QR code using `qr_flutter: ^4.1.0`

The generated QR is displayed full-screen (`QRGeneratePage`) and the student shows it to the verifier.

`[SCREENSHOT]` QR scanner screen.

---

### 4.5.7 Secure Storage on Device

The app stores two categories of sensitive data on-device:

**JWT tokens** are managed by `TokenStorageService` in `lib/core/services/token_storage_services.dart`. It uses `flutter_secure_storage: ^9.2.4` with `AndroidOptions(encryptedSharedPreferences: true)` on Android. This stores the access token and refresh token in the device's encrypted keystore.

```dart
final _flutterStorage = const FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);
```

On app start, the app reads the stored tokens back. If both exist, the session is restored without requiring the student to sign in again. On logout, both tokens are deleted.

**Private key** is managed by `PKStorageService` in `lib/core/services/pk_storage.service.dart`. The student's Ethereum private key is stored in `flutter_secure_storage` as well. It's written once and never overwritten unless the wallet address changes (meaning the student connected a different wallet). If the address changes, the old private key is deleted and the student is prompted to enter the new one.

The private key is only ever used for two things:
1. Signing the EIP-712 schema when generating a QR code
2. Decrypting the ECIES-encrypted credential payload

It never gets sent to the network. All cryptographic operations happen locally on the device.

**Theme preference** is stored in `SharedPreferences` (not secure storage since it's not sensitive). Just a string: `"light"` or `"dark"`.

The distinction between `flutter_secure_storage` and `shared_preferences` is intentional. Anything sensitive (tokens, keys) goes to the encrypted keystore, anything non-sensitive (preferences) goes to regular preferences.

---

### 4.5.8 Real-Time Sync with Socket.io

The app maintains a persistent WebSocket connection to the backend using `socket_io_client: ^3.1.4`. This gives students instant notifications when their credentials are issued, updated, or revoked, no polling needed.

**Connection lifecycle:**

- Connection starts when the student logs in successfully. `AuthController` calls `notificationRepo.connect(accessToken)` in its `onLogin` callback.
- Connection ends when the student logs out. `AuthController` calls `notificationRepo.disconnect()` in its `onLogout` callback.
- If the access token expires while connected, the server emits an `auth_error` event. The socket disconnects and the `authErrorStream` fires. The notification provider listens to this stream, attempts a token refresh, and if successful reconnects with the new token.

**Authentication over Socket.IO:**

The Socket.IO server requires authentication. After connecting, the client immediately emits a `join` event with the access token:

```dart
_socket!.onConnect((data) => _socket!.emit("join", accessToken));
```

The server validates the token and subscribes the socket to that student's notification channel. If the token is invalid or expired, the server emits `auth_error` back.

**Receiving notifications:**

The server emits `notification` events when something happens to the student's credentials. The payload can come as a plain object or as a list `[payload, ackFn]` when the server expects an acknowledgment. The client handles both:

```dart
final payload = data is List ? data[0] : data;
final ack = data is List && data.length > 1 ? data[1] : null;
final notification = AppNotification.fromJson(Map<String, dynamic>.from(payload));
_streamController.add(notification);
if (ack != null) ack('received');
```

The `NotificationController` (Riverpod `StateNotifier`) listens to the notification stream and adds each new notification to its list. It also silently refreshes the credentials list so the student's credential screen is always up to date without a manual pull-to-refresh.

**Unread badge:** The home screen shows a bell icon. A badge on it shows the count of unread notifications. Tapping it opens a bottom sheet listing all notifications. Each one shows the event type, message, transaction hash, and timestamp.

**Acknowledgment:** When the student views a notification, the app emits an `ack_event` with the event ID back to the server:

```dart
void ackEvent(String eventId) {
  _socket?.emit("ack_event", {"id": eventId});
}
```

This marks the notification as seen on the backend side.

---

## Feature Breakdown

### Authentication

**Login screen** (`feature/auth/presentation/pages/login.dart`)

Two actions:
- "SIGN IN WITH A WALLET": for students who already have a verified identity
- "Verify Identity": for new students who need to go through verification first

Sign-in flow: connect wallet → get nonce → sign nonce → verify signature → get tokens → navigate to shell.

If the student doesn't have a verified identity they can't sign in, the login screen shows an info box explaining this.

**Auth Interceptor** (`core/network/auth_interceptor.dart`)

Every API request automatically gets the `Authorization: Bearer <token>` header injected. If a request comes back with 401, the interceptor pauses it, attempts a token refresh, and retries the original request with the new token. If the refresh also fails, it sets `sessionExpiredProvider` to true which triggers logout.

---

### Student Verification (New Students)

Before a student can sign in, they need to verify their identity. This is a one-time flow:

1. **Verify Email** (`feature/auth/presentation/pages/verify_email.dart`): student enters their institutional email address. The backend sends an OTP.
2. **Verify OTP** (`feature/auth/presentation/pages/verify_otp.dart`): student enters the 6-digit OTP using the `pinput` input widget. They also need to connect their wallet here and sign a nonce, so the backend can link their wallet address to their institutional email.
3. On success, the backend issues the student's on-chain identity and returns JWT tokens. The app navigates to the main shell.

---

### Home Dashboard

**Home screen** (`feature/home/presentation/pages/home.dart`)

Shows an overview of the student's account:

- Wallet address (truncated)
- Stats row: total credentials, CGPA, enrollment status
- Recent credentials list (the last few issued credentials)
- Quick actions (Settings, QR)
- Notification bell with unread badge

All data comes from `homeDataProvider`, which is a `FutureProvider.autoDispose` that combines the student profile and credentials into a single `HomeData` model.

If the student hasn't set up their private key yet, a dialog (`PkSetupDialog`) prompts them to enter it. The key is needed for QR generation and credential decryption.

---

### Credentials

**Credential screen** (`feature/credentials/presentation/pages/credential.dart`)

Full list of all credentials issued to the student. Features:

- Search by title or code
- Filter by credential type
- Sort by date (newest/oldest) or title
- Status badge for revoked credentials
- Pull to refresh

Tapping a credential shows the full details in a bottom sheet, including the option to decrypt the payload if a private key is stored on device.

---

### QR Code

**QR screen** (`feature/qr/presentation/pages/qr.dart`)

Two paths: Scan and Generate (described in detail in section 4.5.6).

The QR token generated for sharing is short-lived (student picks the expiry). The backend issues a signed token that the verifier's scanner can validate. This means the student doesn't have to share their raw credential data, the verifier only gets what the backend returns after token validation.

---

### Profile

**Profile screen** (`feature/profile/presentation/pages/profile.dart`)

Full student profile broken into sections. Editable fields: personal info (name, DOB, gender, nationality, national ID, phone) and address.

Photo upload: student can pick a photo from gallery or take one with the camera (`image_picker`). It gets uploaded to the media service before saving.

Phone number field uses `intl_phone_field` for proper country code selection.

---

### Notifications

No dedicated screen, notifications live in a bottom sheet that slides up from the notification bell on the home screen.

The notification model (`AppNotification`) has: event ID, transaction hash, message, created timestamp, and status. Each notification card shows these details. The unread count badge updates whenever new notifications come in via the socket.

---

### Settings

**Settings screen** (`feature/settings/presentation/pages/settings.dart`)

- Light/dark theme toggle (persisted to `SharedPreferences`)
- FAQs section linking to `FaqsPage`
- Security info (what data is stored on device)
- App version info
- Debug section (only shown in debug builds)

---

## Networking & API Layer

**Dio setup** (`core/network/api_client.dart`)

Single Dio instance provided via `dioProvider`. Base URL comes from `AppConfig.apiUrl`. Two interceptors are attached:

1. **`AuthInterceptor`**: injects the bearer token from secure storage on every request. On 401, attempts token refresh and retries. On refresh failure, sets `sessionExpiredProvider` to true.
2. **`MockApiInterceptor`** (only when `USE_MOCK_API=true`): intercepts requests and returns hardcoded mock responses. Useful for development without a running backend.

**Repository pattern:** Every feature has a repository interface in `domain/repos/` and an implementation in `data/repos_impl/`. Datasources in `data/datasources/` are the only place that touches Dio directly. This means the mock API interceptor is one layer, and feature-level mocking (for tests) can be done by swapping the repository implementation.

---

## Cryptography

Two cryptographic operations happen client-side, both using `pointycastle: ^4.0.0`:

**EIP-712 signing** (`core/utils/eip712_sign.dart`)

Signs a typed data schema (credential metadata) using the student's secp256k1 private key. Used when generating a QR code. The implementation:

1. Takes the EIP-712 schema from the backend (domain + types + message)
2. Builds the domain separator and struct hash per the EIP-712 spec
3. Produces the 66-byte `\x19\x01 || domainSeparator || structHash` digest
4. Signs it using RFC 6979 deterministic ECDSA
5. Applies low-S normalization (EIP-2)
6. Returns a 65-byte Ethereum signature as `0x{r}{s}{v}`

**ECIES decryption** (`core/utils/ecies_decrypt.dart`)

Decrypts the credential payload stored on-chain. The payload was encrypted by the backend using the student's public key. Decryption:

1. Parses the ephemeral public key from the encrypted blob
2. Derives the shared secret using ECDH (student private key + ephemeral public key)
3. Derives AES and HMAC keys from the shared secret via HKDF-SHA256
4. Verifies the HMAC tag
5. Decrypts with AES-256-GCM
6. Returns the plaintext credential payload as a JSON string

The private key is read from `FlutterSecureStorage` and used in-memory only. It's not cached anywhere in the app state.

---

## Theme System

Light and dark themes are defined in `core/theme/flex_color_scheme.dart` using the `FlexColorScheme` package. Both themes are fully specified, no mix of Material defaults.

The active theme is managed by `ThemeNotifier` (a `StateNotifier<ThemeMode>`) via the `themeProvider`. It initializes from `SharedPreferences` so the app opens in the student's last-used theme. Switching is instant.

The `logoImageProvider` is a computed provider that returns `'assets/logos/s2dent_light.png'` or `'assets/logos/s2dent_dark.png'` based on the current theme mode. Both logos are precached on startup in `main.dart` so there's no flicker when switching themes.

The `contextExtensions` give widgets easy access to theme colors and text styles without writing `Theme.of(context)` everywhere:

```dart
context.colors.primary
context.texts.bodyMedium
```

---

## Navigation

**Shell:** `ShellPage` wraps the four main tabs (Home, Credentials, QR, Profile) in an `IndexedStack`. Pages are never recreated when switching tabs, state is preserved.

**`shellPageIndexProvider`** (`StateProvider<int>`) tracks the active tab index. `CustomBottomNav` reads it and updates it on tap. `AuthController` resets it to 0 on logout so the next login always starts on Home.

**`navigatorKeyProvider`** is a global navigator key stored in a Riverpod provider. It lets non-widget code (like `AuthController`) push routes programmatically, for example navigating to `ShellPage` after successful login or to `RoleSelectionPage` after logout.

Within features, navigation uses standard `Navigator.push()` with `MaterialPageRoute`. No named routes or go_router, the app's navigation structure is simple enough that explicit pushes are cleaner.

---

## Running the App

**Development with mock API (no backend):**
```bash
flutter run --dart-define=USE_MOCK_API=true
```

**Development against local backend (Docker):**
```bash
flutter run \
  --dart-define=API_URL=http://10.0.2.2:3000/api \
  --dart-define=PROJECT_ID=your_reown_project_id
```

> `10.0.2.2` is the Android emulator's alias for `localhost` on the host machine.

**Development on physical device:**
```bash
flutter run \
  --dart-define=API_URL=http://your-machine-local-ip:3000/api \
  --dart-define=PROJECT_ID=your_reown_project_id
```

**Production build:**
```bash
flutter build apk --release \
  --dart-define=API_URL=https://api.s2dent.app/api \
  --dart-define=PROJECT_ID=your_reown_project_id
```
