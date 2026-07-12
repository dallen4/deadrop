---
'cli': minor
---

Credentials are now stored in the OS keychain (macOS Keychain, Linux
Secret Service via `libsecret`, Windows Credential Vault) instead of a
plaintext `.deadrop/creds` file. Existing plaintext credentials are
removed automatically on first run after upgrading, with a prompt to
sign in again.

Added `deadrop whoami` to check sign-in status without a full
login/logout cycle. `deadrop login` failures now point at the actual
platform-specific fix (libsecret on Linux, the OS keychain access
prompt on macOS/Windows) instead of a Linux-only message.
