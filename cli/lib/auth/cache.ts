import { existsSync, unlinkSync } from 'fs';
import { cwd } from 'process';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';
import { logInfo } from 'lib/log';

const SERVICE = 'deadrop';
const LEGACY_SERVICE = 'deadrop-cli';
const ACCOUNT = 'auth-token';

let warnedKeychainError = false;

// Warn once per process when the keychain backend is unreachable
function warnKeychainOnce(): void {
  if (warnedKeychainError) return;
  warnedKeychainError = true;
  logInfo(
    'Could not reach your OS keychain; continuing unauthenticated. Run `deadrop login` once your keychain is available.',
  );
}

// NoEntry (no stored credential) vs a real backend failure
function isMissingEntry(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? '').toLowerCase();
  return msg.includes('no matching entry') || msg.includes('no entry');
}

// Linux failures are almost always the missing libsecret shared lib;
// macOS/Windows failures are almost always the user denying the
// keychain/Credential Manager access prompt. Point at the fix for each,
// since "install libsecret" is meaningless (and confusing) on a Mac.
//
// List every package manager rather than detecting the distro — detection
// is more code and more ways to be wrong, and naming only apt sends Fedora
// and Arch users to a command that doesn't exist. Mirrors install.sh.
function keychainUnavailableMessage(): string {
  if (process.platform === 'linux') {
    return `Secure credential storage is unavailable. Install libsecret, then run \`deadrop login\` again:
  Ubuntu/Debian: sudo apt-get install -y libsecret-1-0
  Fedora/RHEL:   sudo dnf install -y libsecret
  Arch:          sudo pacman -S libsecret`;
  }
  return 'Secure credential storage is unavailable. If your OS just prompted for keychain access, allow it and run `deadrop login` again.';
}

// Never throws: missing entry is silent, backend failure warns once.
// Falls back to the pre-rename `deadrop-cli` service on a miss and
// migrates it forward to `deadrop`, so existing CLI installs don't need
// to re-login after the service rename.
export async function getToken(): Promise<string> {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
      const token = await Bun.secrets.get({ service: SERVICE, name: ACCOUNT });
      if (token) return token;

      const legacyToken = await Bun.secrets.get({
        service: LEGACY_SERVICE,
        name: ACCOUNT,
      });
      if (!legacyToken) return '';

      await Bun.secrets.set({
        service: SERVICE,
        name: ACCOUNT,
        value: legacyToken,
      });
      try {
        await Bun.secrets.delete({ service: LEGACY_SERVICE, name: ACCOUNT });
      } catch {
        // best effort
      }
      return legacyToken;
    }

    const { Entry } = require('@napi-rs/keyring');

    let token: string | undefined;
    try {
      token = new Entry(SERVICE, ACCOUNT).getPassword();
    } catch (err) {
      if (!isMissingEntry(err)) throw err;
    }
    if (token) return token;

    let legacyToken: string | undefined;
    try {
      legacyToken = new Entry(LEGACY_SERVICE, ACCOUNT).getPassword();
    } catch (err) {
      if (!isMissingEntry(err)) throw err;
    }
    if (!legacyToken) return '';

    new Entry(SERVICE, ACCOUNT).setPassword(legacyToken);
    try {
      new Entry(LEGACY_SERVICE, ACCOUNT).deletePassword();
    } catch {
      // best effort
    }
    return legacyToken;
  } catch (err) {
    if (!isMissingEntry(err)) warnKeychainOnce();
    return '';
  }
}

// Login-only write: failure surfaces instead of faking a successful login
export async function setSession(token: string): Promise<void> {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
      await Bun.secrets.set({
        service: SERVICE,
        name: ACCOUNT,
        value: token,
      });
      return;
    }
    const { Entry } = require('@napi-rs/keyring');
    new Entry(SERVICE, ACCOUNT).setPassword(token);
  } catch {
    throw new Error(keychainUnavailableMessage());
  }
}

export async function clearSession(): Promise<void> {
  if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
    try {
      await Bun.secrets.delete({ service: SERVICE, name: ACCOUNT });
    } catch {
      // already gone or backend unavailable
    }
    try {
      await Bun.secrets.delete({ service: LEGACY_SERVICE, name: ACCOUNT });
    } catch {
      // already gone or backend unavailable
    }
    return;
  }
  const { Entry } = require('@napi-rs/keyring');
  try {
    new Entry(SERVICE, ACCOUNT).deletePassword();
  } catch {
    // already gone or backend unavailable
  }
  try {
    new Entry(LEGACY_SERVICE, ACCOUNT).deletePassword();
  } catch {
    // already gone or backend unavailable
  }
}

// Remove the legacy plaintext creds file from cwd, if present
export function migrateLegacyCreds(): void {
  const legacyPath = `${cwd()}/${STORAGE_DIR_NAME}/creds`;
  if (!existsSync(legacyPath)) return;
  unlinkSync(legacyPath);
  logInfo(
    'Removed legacy plaintext credential; credentials now use your OS keychain. Run `deadrop login` to sign in again.',
  );
}
