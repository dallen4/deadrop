use libsql::Builder;
use serde::{Deserialize, Serialize};

// Mirrors shared/types/config.ts's CloudVaultConfig/VaultDBConfig, minus
// `environments` (encryption keys never leave the webview — see
// shared/lib/secrets.ts) and `name` (not needed to open the DB).
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

async fn open(config: &VaultDbConfigDto) -> Result<libsql::Database, String> {
    let db = match &config.cloud {
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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS secrets (
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            environment TEXT NOT NULL,
            PRIMARY KEY (name, environment)
        )",
        (),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
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
