use crate::init_db;
use axum::{Json, extract::State};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct RestorePayload {
    #[allow(dead_code)]
    pub data: String, // The base64 encoded sqlite file from the frontend
}

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64_STD;
use sqlx::Row;

// 🔥 1. BACKUP HANDLER
pub async fn backup_database(State(pool): State<PgPool>) -> Json<Value> {
    let tables = [
        "app_settings", "projects", "project_boq", "master_boq", "resources", 
        "regions", "crm_contacts", "org_staff", "staff_work_logs", 
        "messages", "private_messages", "project_documents"
    ];

    let mut backup_data = serde_json::Map::new();

    for table in tables {
        let query = format!("SELECT row_to_json(t) FROM {} t", table);
        let rows_result = sqlx::query(&query).fetch_all(&pool).await;
        
        match rows_result {
            Ok(rows) => {
                let mut table_rows = Vec::new();
                for row in rows {
                    if let Ok(json_val) = row.try_get::<Value, _>(0) {
                        table_rows.push(json_val);
                    }
                }
                backup_data.insert(table.to_string(), Value::Array(table_rows));
            },
            Err(e) => {
                return Json(json!({ "success": false, "error": format!("Failed to backup table {}: {}", table, e) }));
            }
        }
    }

    let backup_json_str = serde_json::to_string(&backup_data).unwrap_or_default();
    let base64_payload = BASE64_STD.encode(backup_json_str.as_bytes());

    Json(json!(base64_payload))
}

// 🔥 2. RESTORE HANDLER
pub async fn restore_database(
    State(pool): State<PgPool>,
    Json(payload): Json<RestorePayload>,
) -> Json<Value> {
    let decoded = match BASE64_STD.decode(&payload.data) {
        Ok(d) => d,
        Err(e) => return Json(json!({ "success": false, "error": format!("Failed to decode base64: {}", e) }))
    };

    let backup_json_str = match String::from_utf8(decoded) {
        Ok(s) => s,
        Err(e) => return Json(json!({ "success": false, "error": format!("Invalid UTF-8 in backup data: {}", e) }))
    };

    let backup_data: Value = match serde_json::from_str(&backup_json_str) {
        Ok(v) => v,
        Err(e) => return Json(json!({ "success": false, "error": format!("Invalid JSON in backup data: {}", e) }))
    };

    let obj = match backup_data.as_object() {
        Some(o) => o,
        None => return Json(json!({ "success": false, "error": "Backup data is not a JSON object" }))
    };

    let tables = [
        "app_settings", "projects", "project_boq", "master_boq", "resources", 
        "regions", "crm_contacts", "org_staff", "staff_work_logs", 
        "messages", "private_messages", "project_documents"
    ];

    for table in tables {
        let query = format!("DELETE FROM {}", table);
        if let Err(e) = sqlx::query(&query).execute(&pool).await {
            return Json(json!({ "success": false, "error": format!("Purge failed on {}: {}", table, e) }));
        }
    }

    for table in tables {
        if let Some(rows) = obj.get(table).and_then(|v| v.as_array()) {
            for row in rows {
                let row_str = row.to_string();
                let query = format!("INSERT INTO {} SELECT * FROM json_populate_record(null::{}, $1::json)", table, table);
                if let Err(e) = sqlx::query(&query).bind(&row_str).execute(&pool).await {
                    return Json(json!({ "success": false, "error": format!("Failed to restore row in {}: {}", table, e) }));
                }
            }
        }
    }

    if let Err(e) = init_db(&pool).await {
        return Json(json!({ "success": false, "error": format!("Re-initialization failed: {}", e) }));
    }

    Json(json!("Database restored successfully."))
}

pub async fn purge_database(State(pool): State<PgPool>) -> Json<Value> {
    let tables = [
        "app_settings",
        "projects",
        "project_boq",
        "master_boq",
        "resources",
        "regions",
        "crm_contacts",
        "org_staff",
        "staff_work_logs",
        "messages",
        "private_messages",
        "project_documents",
    ];

    for table in tables {
        let query = format!("DELETE FROM {}", table);
        if let Err(e) = sqlx::query(&query).execute(&pool).await {
            return Json(
                json!({ "success": false, "error": format!("Purge failed on {}: {}", table, e) }),
            );
        }
    }

    // Restore the default Admin account so we can log back in
    if let Err(e) = init_db(&pool).await {
        return Json(
            json!({ "success": false, "error": format!("Re-initialization failed: {}", e) }),
        );
    }

    Json(json!({ "success": true }))
}
