mod config_import;
mod keychain_store;
mod vault_store;

use config_import::{read_app_vault_config, read_external_text_file, write_app_vault_config};
use keychain_store::{clear_auth_token, get_auth_token, set_auth_token};
use vault_store::{
    vault_add_secret, vault_delete_secret, vault_ensure_schema, vault_get_encrypted_secret,
    vault_list_secret_names, vault_rename_secret, vault_update_secret,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_auth_token,
            set_auth_token,
            clear_auth_token,
            vault_ensure_schema,
            vault_list_secret_names,
            vault_get_encrypted_secret,
            vault_add_secret,
            vault_update_secret,
            vault_rename_secret,
            vault_delete_secret,
            read_external_text_file,
            read_app_vault_config,
            write_app_vault_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
