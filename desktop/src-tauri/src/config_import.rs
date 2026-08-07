// Reads an arbitrary-path .deadroprc chosen via the file picker (a CLI/
// vscode-extension project vault config). Not routed through the fs plugin
// (its scope is pinned to $APPDATA — see capabilities/default.json) since
// vault_store.rs already establishes the pattern of app commands opening
// user-chosen absolute paths directly.
#[tauri::command]
pub fn read_external_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
