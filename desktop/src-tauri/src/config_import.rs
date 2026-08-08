// Reads an arbitrary-path .deadroprc chosen via the file picker (a CLI/
// vscode-extension project vault config). Not routed through the fs plugin
// (its scope is pinned to $APPDATA — see capabilities/default.json) since
// vault_store.rs already establishes the pattern of app commands opening
// user-chosen absolute paths directly.
#[tauri::command]
pub fn read_external_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

fn app_config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(".deadroprc"))
}

// This app's own `.deadroprc` (in the Tauri app-data dir) went through
// `@tauri-apps/plugin-fs` originally, but writes silently no-op'd there —
// the `$APPDATA/**` capability scope pattern doesn't reliably match a file
// directly at $APPDATA's root, only nested paths. Reading/writing it as a
// plain Rust command sidesteps that scope matching entirely, same as
// `read_external_text_file` above and vault_store.rs's DB access.
#[tauri::command]
pub fn read_app_vault_config(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app_config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_app_vault_config(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = app_config_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, contents).map_err(|e| e.to_string())
}
