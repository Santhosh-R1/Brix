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

// 🔥 1. BACKUP HANDLER (DEPRECATED FOR POSTGRES)
pub async fn backup_database(State(_pool): State<PgPool>) -> Json<Value> {
    Json(json!({ "success": false, "error": "Backup functionality is not available for managed PostgreSQL databases." }))
}

// 🔥 2. RESTORE HANDLER (DEPRECATED FOR POSTGRES)
pub async fn restore_database(
    State(_pool): State<PgPool>,
    Json(_payload): Json<RestorePayload>,
) -> Json<Value> {
    Json(json!({ "success": false, "error": "Restore functionality is not available for managed PostgreSQL databases." }))
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
