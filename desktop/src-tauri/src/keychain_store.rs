use keyring::{Entry, Error as KeyringError};

const SERVICE: &str = "deadrop";
const LEGACY_SERVICE: &str = "deadrop-cli";
const ACCOUNT: &str = "auth-token";

// Reads/writes the OS keychain entry shared with the CLI
// (cli/lib/auth/cache.ts) so signing in on either surface signs you in on
// both. Consumed from the webview by desktop/src/lib/native-clerk.ts's FAPI
// request/response interceptors — mirrors cli/lib/auth/clerk.ts exactly,
// just with keyring calls swapped for invoke() round-trips to here.

// Tries the current service name first, then falls back to the pre-rename
// `deadrop-cli` entry and migrates it forward — mirrors
// cli/lib/auth/cache.ts's getToken() so either platform can perform the
// one-time migration, whichever runs first after the upgrade.
#[tauri::command]
pub fn get_auth_token() -> Option<String> {
    match Entry::new(SERVICE, ACCOUNT).and_then(|e| e.get_password()) {
        Ok(token) => return Some(token),
        Err(KeyringError::NoEntry) => {}
        Err(_) => return None, // backend unreachable: degrade to signed-out
    }

    let legacy_token = Entry::new(LEGACY_SERVICE, ACCOUNT)
        .and_then(|e| e.get_password())
        .ok()?;

    set_auth_token(legacy_token.clone());
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, ACCOUNT) {
        let _ = legacy_entry.delete_credential(); // best effort
    }
    Some(legacy_token)
}

#[tauri::command]
pub fn set_auth_token(token: String) {
    if let Ok(entry) = Entry::new(SERVICE, ACCOUNT) {
        let _ = entry.set_password(&token);
    }
}

// Full clear on explicit sign-out (Clerk's own signOut() only deactivates
// the session, it doesn't drop the client-level token — see spec). Clears
// both names since a pre-migration legacy entry may still be present.
#[tauri::command]
pub fn clear_auth_token() {
    if let Ok(entry) = Entry::new(SERVICE, ACCOUNT) {
        let _ = entry.delete_credential();
    }
    if let Ok(entry) = Entry::new(LEGACY_SERVICE, ACCOUNT) {
        let _ = entry.delete_credential();
    }
}
