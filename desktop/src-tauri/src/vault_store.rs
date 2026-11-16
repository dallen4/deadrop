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

const HAS_SECRETS_TABLE: &str =
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'secrets'";

// Mirrors shared/db/init.ts's ensureSecretsSchema. DDL counts as a write
// even when it's a no-op, and a shared vault's read-only token refuses it.
async fn ensure_secrets_table(conn: &libsql::Connection) -> Result<(), String> {
    let mut rows = conn
        .query(HAS_SECRETS_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;
    if rows.next().await.map_err(|e| e.to_string())?.is_some() {
        return Ok(());
    }
    conn.execute(CREATE_SECRETS_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

const UNLINKED_VAULT: &str =
    "This vault's local file isn't linked to its cloud copy. Turn cloud sync off and back on to link it.";

// Turso no longer serves the v1 replication protocol, so v1 replicas are
// dead caches. v1 delegated every write to the primary, so they hold no
// local-only data and are safe to clear.
const V1_INDEX: &str = "-client_wal_index";
const DB_FILES: [&str; 5] = ["", "-wal", "-shm", "-info", V1_INDEX];

// libsql's v2 sync opens an existing file only beside its `-info` metadata.
fn is_replica(location: &str) -> bool {
    Path::new(&format!("{location}-info")).exists()
}

fn is_v1_cache(location: &str) -> bool {
    !is_replica(location) && Path::new(&format!("{location}{V1_INDEX}")).exists()
}

fn remove_db_files(location: &str) {
    for suffix in DB_FILES {
        let _ = std::fs::remove_file(format!("{location}{suffix}"));
    }
}

async fn open_replica(location: &str, cloud: &CloudConfigDto) -> Result<libsql::Database, String> {
    Builder::new_remote_replica(
        location,
        cloud.sync_url.clone(),
        cloud.auth_token.clone().unwrap_or_default(),
    )
    .sync_protocol(libsql::SyncProtocol::V2)
    .build()
    .await
    .map_err(|e| e.to_string())
}

fn sibling_path(location: &str, suffix: &str) -> String {
    match location.strip_suffix(".db") {
        Some(stem) => format!("{stem}-{suffix}.db"),
        None => format!("{location}-{suffix}"),
    }
}

fn replica_path(location: &str) -> String {
    sibling_path(location, "cloud")
}

// Mirrors shared/db/attach.ts's cloudReplicaPath.
fn attach_target(location: &str) -> String {
    if is_replica(location) {
        location.to_string()
    } else {
        replica_path(location)
    }
}

async fn open(config: &VaultDbConfigDto) -> Result<libsql::Database, String> {
    let db = match &config.cloud {
        Some(cloud) => {
            if is_v1_cache(&config.location) {
                remove_db_files(&config.location);
            } else if Path::new(&config.location).exists() && !is_replica(&config.location) {
                return Err(UNLINKED_VAULT.to_string());
            }
            open_replica(&config.location, cloud).await?
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
    ensure_secrets_table(&conn).await
}

// Mirrors shared/db/attach.ts. Copies the vault's rows into a fresh replica
// and returns its path. A local file gets one beside it and stays as a
// backup. A detached replica has diverged from its sync metadata, so it
// re-pulls in place after a `-detached` backup. Cloud rows win on conflict.
#[tauri::command]
pub async fn vault_attach_cloud(config: VaultDbConfigDto) -> Result<String, String> {
    let cloud = config
        .cloud
        .as_ref()
        .ok_or_else(|| "Cloud config is required.".to_string())?;

    if is_v1_cache(&config.location) {
        remove_db_files(&config.location);
    }
    if !Path::new(&config.location).exists() {
        return Ok(config.location);
    }

    let local = Builder::new_local(&config.location)
        .build()
        .await
        .map_err(|e| e.to_string())?;
    let local_conn = local.connect().map_err(|e| e.to_string())?;
    ensure_secrets_table(&local_conn).await?;
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

    let replica = attach_target(&config.location);
    if replica == config.location {
        let backup = sibling_path(&config.location, "detached");
        let _ = std::fs::remove_file(&backup);
        local_conn
            .execute("VACUUM INTO ?1", libsql::params![backup])
            .await
            .map_err(|e| e.to_string())?;
    }
    drop(rows);
    drop(local_conn);
    drop(local);

    // Otherwise a leftover replica from a failed attempt, only a cache.
    remove_db_files(&replica);

    let db = open_replica(&replica, cloud).await?;
    sync_with_retry(&db, 8, 750).await?;

    let conn = db.connect().map_err(|e| e.to_string())?;
    ensure_secrets_table(&conn).await?;
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

    // Runs the real attach against Turso:
    // DEADROP_LIVE_URL=libsql://... DEADROP_LIVE_TOKEN=... cargo test live -- --ignored
    #[tokio::test(flavor = "multi_thread")]
    #[ignore]
    async fn live_attach_copies_local_rows_into_turso() {
        let sync_url = std::env::var("DEADROP_LIVE_URL").unwrap();
        let token = std::env::var("DEADROP_LIVE_TOKEN").unwrap();
        let location = temp_db("live");
        let replica = replica_path(&location);
        remove_db_files(&location);
        remove_db_files(&replica);

        let local = Builder::new_local(&location).build().await.unwrap();
        let conn = local.connect().unwrap();
        conn.execute(CREATE_SECRETS_TABLE, ()).await.unwrap();
        conn.execute("INSERT INTO secrets VALUES ('live', 'x', 'live')", ())
            .await
            .unwrap();
        drop(conn);
        drop(local);

        let config = |location: &str| VaultDbConfigDto {
            location: location.to_string(),
            cloud: Some(CloudConfigDto {
                sync_url: sync_url.clone(),
                auth_token: Some(token.clone()),
            }),
        };

        // A failed attempt's leftovers must not wedge the retry.
        std::fs::write(format!("{replica}-info"), b"{}").unwrap();

        let attached = vault_attach_cloud(config(&location)).await.unwrap();
        assert_eq!(attached, replica);
        assert!(is_replica(&attached));

        let names = vault_list_secret_names(config(&attached)).await.unwrap();
        assert!(names.iter().any(|s| s.name == "live"));

        // A dead v1 cache re-pulls over v2 instead of erroring. Same order
        // as useVault: ensure schema (which syncs), then read.
        let v1 = temp_db("live-v1");
        remove_db_files(&v1);
        std::fs::write(&v1, b"").unwrap();
        std::fs::write(format!("{v1}{V1_INDEX}"), b"").unwrap();
        vault_ensure_schema(config(&v1)).await.unwrap();
        let names = vault_list_secret_names(config(&v1)).await.unwrap();
        assert!(names.iter().any(|s| s.name == "live"));
        assert!(is_replica(&v1));

        // Detached: written as a plain local file, sync metadata now stale.
        // Reattaching re-pulls in place and keeps the local write.
        vault_add_detached(&attached).await;
        assert_eq!(
            vault_attach_cloud(config(&attached)).await.unwrap(),
            attached
        );
        assert!(Path::new(&sibling_path(&attached, "detached")).exists());
        let names = vault_list_secret_names(config(&attached)).await.unwrap();
        assert!(names.iter().any(|s| s.name == "live"));
        assert!(names.iter().any(|s| s.name == "live-detached"));

        for name in ["live", "live-detached"] {
            vault_delete_secret(config(&attached), name.into(), Some("live".into()))
                .await
                .unwrap();
        }
    }

    // DEADROP_LIVE_RO_TOKEN: a read-only token for the same db, as a share
    // recipient holds.
    #[tokio::test(flavor = "multi_thread")]
    #[ignore]
    async fn live_opens_a_shared_vault_with_a_read_only_token() {
        let sync_url = std::env::var("DEADROP_LIVE_URL").unwrap();
        let Ok(token) = std::env::var("DEADROP_LIVE_RO_TOKEN") else {
            return;
        };
        let location = temp_db("live-ro");
        remove_db_files(&location);
        let config = || VaultDbConfigDto {
            location: location.clone(),
            cloud: Some(CloudConfigDto {
                sync_url: sync_url.clone(),
                auth_token: Some(token.clone()),
            }),
        };

        vault_ensure_schema(config()).await.unwrap();
        vault_list_secret_names(config()).await.unwrap();
    }

    async fn vault_add_detached(location: &str) {
        let db = Builder::new_local(location).build().await.unwrap();
        db.connect()
            .unwrap()
            .execute(
                "INSERT INTO secrets VALUES ('live-detached', 'x', 'live')",
                (),
            )
            .await
            .unwrap();
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
    async fn opens_a_v2_replica() {
        let location = temp_db("v2");
        std::fs::write(&location, b"").unwrap();
        std::fs::write(format!("{location}-info"), b"").unwrap();

        assert!(is_replica(&location));
    }

    #[test]
    fn attach_target_keeps_a_replica_in_place() {
        let location = temp_db("replica");
        std::fs::write(&location, b"").unwrap();
        std::fs::write(format!("{location}-info"), b"").unwrap();

        assert_eq!(attach_target(&location), location);
    }

    #[test]
    fn attach_target_moves_a_local_file_beside_it() {
        let location = temp_db("plain");
        remove_db_files(&location);

        assert_eq!(attach_target(&location), replica_path(&location));
    }

    #[tokio::test]
    async fn attach_clears_a_v1_cache_in_place() {
        let location = temp_db("v1");
        std::fs::write(&location, b"").unwrap();
        std::fs::write(format!("{location}{V1_INDEX}"), b"").unwrap();

        let path = vault_attach_cloud(cloud_config(&location)).await;

        assert_eq!(path, Ok(location.clone()));
        assert!(!Path::new(&location).exists());
        assert!(!Path::new(&format!("{location}{V1_INDEX}")).exists());
    }

    #[tokio::test]
    async fn attach_keeps_the_path_when_nothing_is_local_yet() {
        let location = temp_db("missing");

        let path = vault_attach_cloud(cloud_config(&location)).await;

        assert_eq!(path, Ok(location));
    }
}
