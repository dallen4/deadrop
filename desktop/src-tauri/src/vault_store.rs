use libsql::Builder;
use serde::{Deserialize, Serialize};
use std::path::Path;

// Mirrors shared/types/config.ts's CloudVaultConfig/VaultDBConfig, minus
// `environments` (encryption keys never leave the webview — see
// shared/lib/secrets.ts) and `name`. Config no longer stores a sync URL;
// the webview derives it (vaultSyncUrl) and passes it down, so the org
// slug lives in one place instead of being duplicated in Rust.
#[derive(Deserialize)]
pub struct CloudConfigDto {
    #[serde(rename = "syncUrl")]
    sync_url: String,
    #[serde(rename = "authToken")]
    auth_token: Option<String>,
}

#[derive(Deserialize)]
pub struct VaultDbConfigDto {
    location: String,
    cloud: Option<CloudConfigDto>,
}

#[derive(Serialize)]
pub struct SecretNameDto {
    name: String,
    environment: String,
}

const RETRYABLE_SYNC_ERRORS: [&str; 2] = ["PrimaryHandshakeTimeout", "Unavailable"];

const CREATE_SECRETS_TABLE: &str = "CREATE TABLE IF NOT EXISTS secrets (
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    environment TEXT NOT NULL,
    PRIMARY KEY (name, environment)
)";

const UNLINKED_VAULT: &str =
    "This vault's local file isn't linked to its cloud copy. Turn cloud sync off and back on to link it.";

// libsql only opens an existing file as a replica when this index sits
// beside it, so a vault that started local never has one.
fn is_replica(location: &str) -> bool {
    Path::new(&format!("{location}-client_wal_index")).exists()
}

fn replica_path(location: &str) -> String {
    match location.strip_suffix(".db") {
        Some(stem) => format!("{stem}-cloud.db"),
        None => format!("{location}-cloud"),
    }
}

async fn open(config: &VaultDbConfigDto) -> Result<libsql::Database, String> {
    let db = match &config.cloud {
        Some(_) if Path::new(&config.location).exists() && !is_replica(&config.location) => {
            return Err(UNLINKED_VAULT.to_string());
        }
        Some(cloud) => {
            let builder = Builder::new_remote_replica(
                &config.location,
                cloud.sync_url.clone(),
                cloud.auth_token.clone().unwrap_or_default(),
            );
            builder.build().await.map_err(|e| e.to_string())?
        }
        None => Builder::new_local(&config.location)
            .build()
            .await
            .map_err(|e| e.to_string())?,
    };
    Ok(db)
}

// Mirrors shared/db/init.ts's syncWithRetry.
async fn sync_with_retry(
    db: &libsql::Database,
    mut attempts_left: u32,
    delay_ms: u64,
) -> Result<(), String> {
    loop {
        match db.sync().await {
            Ok(_) => return Ok(()),
            Err(e) => {
                let msg = e.to_string();
                let retryable = RETRYABLE_SYNC_ERRORS.iter().any(|s| msg.contains(s));
                if !retryable || attempts_left <= 1 {
                    return Err(msg);
                }
                attempts_left -= 1;
                tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
            }
        }
    }
}

async fn sync_if_cloud(db: &libsql::Database, config: &VaultDbConfigDto) -> Result<(), String> {
    if config.cloud.is_some() {
        sync_with_retry(db, 8, 750).await?;
    }
    Ok(())
}

// Mirrors shared/db/init.ts's ensureSecretsSchema.
#[tauri::command]
pub async fn vault_ensure_schema(config: VaultDbConfigDto) -> Result<(), String> {
    let db = open(&config).await?;
    if config.cloud.is_some() {
        sync_with_retry(&db, 8, 750).await?;
    }
    let conn = db.connect().map_err(|e| e.to_string())?;
    conn.execute(CREATE_SECRETS_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Copies a local-only vault's rows into a fresh replica beside it and
// returns the replica's path. The original file is left as a backup.
// Rows already in the cloud copy win on conflict.
#[tauri::command]
pub async fn vault_attach_cloud(config: VaultDbConfigDto) -> Result<String, String> {
    let cloud = config
        .cloud
        .as_ref()
        .ok_or_else(|| "Cloud config is required.".to_string())?;

    if !Path::new(&config.location).exists() || is_replica(&config.location) {
        return Ok(config.location);
    }

    let local = Builder::new_local(&config.location)
        .build()
        .await
        .map_err(|e| e.to_string())?;
    let local_conn = local.connect().map_err(|e| e.to_string())?;
    local_conn
        .execute(CREATE_SECRETS_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;
    let mut rows = local_conn
        .query("SELECT name, value, environment FROM secrets", ())
        .await
        .map_err(|e| e.to_string())?;

    let mut secrets = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        secrets.push((
            row.get::<String>(0).map_err(|e| e.to_string())?,
            row.get::<String>(1).map_err(|e| e.to_string())?,
            row.get::<String>(2).map_err(|e| e.to_string())?,
        ));
    }

    // A leftover replica from a failed attempt is only a cache of the cloud.
    let replica = replica_path(&config.location);
    for suffix in ["", "-wal", "-shm", "-client_wal_index"] {
        let _ = std::fs::remove_file(format!("{replica}{suffix}"));
    }

    let db = Builder::new_remote_replica(
        &replica,
        cloud.sync_url.clone(),
        cloud.auth_token.clone().unwrap_or_default(),
    )
    .build()
    .await
    .map_err(|e| e.to_string())?;
    sync_with_retry(&db, 8, 750).await?;

    let conn = db.connect().map_err(|e| e.to_string())?;
    conn.execute(CREATE_SECRETS_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;
    for (name, value, environment) in secrets {
        conn.execute(
            "INSERT OR IGNORE INTO secrets (name, value, environment) VALUES (?1, ?2, ?3)",
            libsql::params![name, value, environment],
        )
        .await
        .map_err(|e| e.to_string())?;
    }
    sync_with_retry(&db, 8, 750).await?;

    Ok(replica)
}

#[tauri::command]
pub async fn vault_list_secret_names(
    config: VaultDbConfigDto,
) -> Result<Vec<SecretNameDto>, String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    let mut rows = conn
        .query("SELECT name, environment FROM secrets", ())
        .await
        .map_err(|e| e.to_string())?;

    let mut names = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        names.push(SecretNameDto {
            name: row.get::<String>(0).map_err(|e| e.to_string())?,
            environment: row.get::<String>(1).map_err(|e| e.to_string())?,
        });
    }
    Ok(names)
}

#[tauri::command]
pub async fn vault_get_encrypted_secret(
    config: VaultDbConfigDto,
    name: String,
    environment: String,
) -> Result<Option<String>, String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    let mut rows = conn
        .query(
            "SELECT value FROM secrets WHERE name = ?1 AND environment = ?2",
            libsql::params![name, environment],
        )
        .await
        .map_err(|e| e.to_string())?;

    match rows.next().await.map_err(|e| e.to_string())? {
        Some(row) => Ok(Some(row.get::<String>(0).map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn vault_add_secret(
    config: VaultDbConfigDto,
    name: String,
    environment: String,
    encrypted_value: String,
) -> Result<(), String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO secrets (name, value, environment) VALUES (?1, ?2, ?3)",
        libsql::params![name, encrypted_value, environment],
    )
    .await
    .map_err(|e| e.to_string())?;
    sync_if_cloud(&db, &config).await
}

#[tauri::command]
pub async fn vault_update_secret(
    config: VaultDbConfigDto,
    name: String,
    environment: String,
    encrypted_value: String,
) -> Result<(), String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE secrets SET value = ?1 WHERE name = ?2 AND environment = ?3",
        libsql::params![encrypted_value, name, environment],
    )
    .await
    .map_err(|e| e.to_string())?;
    sync_if_cloud(&db, &config).await
}

#[tauri::command]
pub async fn vault_rename_secret(
    config: VaultDbConfigDto,
    old_name: String,
    new_name: String,
    environment: String,
) -> Result<(), String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE secrets SET name = ?1 WHERE name = ?2 AND environment = ?3",
        libsql::params![new_name, old_name, environment],
    )
    .await
    .map_err(|e| e.to_string())?;
    sync_if_cloud(&db, &config).await
}

#[tauri::command]
pub async fn vault_delete_secret(
    config: VaultDbConfigDto,
    name: String,
    environment: Option<String>,
) -> Result<(), String> {
    let db = open(&config).await?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    match environment {
        Some(env) => {
            conn.execute(
                "DELETE FROM secrets WHERE name = ?1 AND environment = ?2",
                libsql::params![name, env],
            )
            .await
        }
        None => {
            conn.execute("DELETE FROM secrets WHERE name = ?1", libsql::params![name])
                .await
        }
    }
    .map_err(|e| e.to_string())?;
    sync_if_cloud(&db, &config).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(name: &str) -> String {
        let dir = std::env::temp_dir().join(format!("deadrop-vault-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("vault.db").to_string_lossy().into_owned()
    }

    fn cloud_config(location: &str) -> VaultDbConfigDto {
        VaultDbConfigDto {
            location: location.to_string(),
            cloud: Some(CloudConfigDto {
                sync_url: "libsql://unreachable.invalid".to_string(),
                auth_token: None,
            }),
        }
    }

    #[test]
    fn replica_path_sits_beside_the_local_file() {
        assert_eq!(replica_path("/a/default.db"), "/a/default-cloud.db");
        assert_eq!(replica_path("/a/default"), "/a/default-cloud");
    }

    #[tokio::test]
    async fn refuses_to_open_an_unlinked_local_file_as_a_replica() {
        let location = temp_db("unlinked");
        std::fs::write(&location, b"").unwrap();

        let err = open(&cloud_config(&location)).await.err();

        assert_eq!(err.as_deref(), Some(UNLINKED_VAULT));
    }

    #[tokio::test]
    async fn attach_keeps_the_path_when_already_a_replica() {
        let location = temp_db("replica");
        std::fs::write(&location, b"").unwrap();
        std::fs::write(format!("{location}-client_wal_index"), b"").unwrap();

        let path = vault_attach_cloud(cloud_config(&location)).await;

        assert_eq!(path, Ok(location));
    }

    #[tokio::test]
    async fn attach_keeps_the_path_when_nothing_is_local_yet() {
        let location = temp_db("missing");

        let path = vault_attach_cloud(cloud_config(&location)).await;

        assert_eq!(path, Ok(location));
    }
}
