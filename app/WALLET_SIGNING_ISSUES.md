================================================================
  S2DENT — MetaMask Deep Link & Session Management Fix
================================================================


SIGN-IN FLOW
------------
  1. User taps "Sign In with Wallet"
  2. App opens MetaMask to connect the wallet  (first time only)
  3. MetaMask redirects back to the app
  4. App sends a nonce to MetaMask to sign      (identity proof)
  5. MetaMask redirects back to the app
  6. App verifies the signature with the backend → user is in


================================================================
  ISSUE 1 — App not redirecting back after MetaMask request
================================================================

  WHAT HAPPENED
  -------------
  After the user approved a request in MetaMask (either the
  wallet connection or the nonce signing), MetaMask had no way
  to bring the user back to the app. The user was left stranded
  in MetaMask with no automatic return.


  ROOT CAUSE — Broken deep link configuration
  --------------------------------------------
  Deep links are how MetaMask calls back into the app once a
  request is approved. Four things were broken:

    Android   →  URL scheme was "s2udent://" (typo) instead of
                 "s2dent://" — no app owned the scheme, so the
                 callback had nowhere to go.

    Android   →  flutter_deeplinking_enabled was set to false —
                 Flutter was silently dropping all incoming links.

    iOS       →  No custom URL scheme was registered — iOS had
                 no handler for the s2dent:// callback at all.

    Both      →  PairingMetadata had no redirect field — MetaMask
                 didn't know which URL to call when done.


  FIX
  ---
    - Added  redirect: Redirect(native: 's2dent://')  to
      PairingMetadata so MetaMask knows where to return.
    - Fixed the Android URL scheme typo  (s2udent → s2dent).
    - Set  flutter_deeplinking_enabled = true  on Android.
    - Registered CFBundleURLTypes with the s2dent scheme on iOS.


================================================================
  ISSUE 2 — Re-login after logout stuck on login page
================================================================

  WHAT HAPPENED
  -------------
  After a successful login + logout, the user tried to sign in
  again. Since the wallet was already connected, the app skipped
  the connection step and jumped straight to the nonce signing.

  The user confirmed in MetaMask, was redirected back correctly
  (Issue 1 was fixed), but the app stayed on the login page
  instead of navigating to the home page.


  ROOT CAUSE — Stale ReownAppKitModal session
  --------------------------------------------
  On logout, only the backend tokens were cleared. The
  ReownAppKitModal instance was kept alive with its old wallet
  session intact. When re-login started on this stale modal,
  its internal state was in a half-connected limbo — causing
  the signing flow to silently fail after the user confirmed.


  FIX
  ---
  On logout, the app now does three things:

    1. Calls modal.disconnect()
       Explicitly ends the wallet session with MetaMask.

    2. Resets appKitModalProvider to null
       Disposes the stale modal instance entirely.

    3. Re-initializes on the next login
       LoginPage._initAppKit() runs fresh, creating a brand new
       ReownAppKitModal with no prior session.

  This guarantees every sign-in starts clean:
  connect wallet → sign nonce → authenticated.


================================================================
  BONUS — Lifecycle observer that became the problem
================================================================

  A WidgetsBindingObserver was added early as a workaround for
  Issue 1 (when deep links didn't work). It detected when the
  user returned from MetaMask and cancelled the pending sign-in
  — because without deep links, the request would hang forever.

  Once deep links were fixed, this observer became harmful.
  When the user returned from MetaMask after a successful sign,
  the observer fired and cancelled the sign-in right before the
  signature could be processed. It was removed once deep links
  were confirmed working.

================================================================
