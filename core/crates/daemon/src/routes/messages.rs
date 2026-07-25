use crate::{routes::ApiResponse, routes::api_response};
use axum::extract::{Path, Query, State};
use axum::{Json, extract::Multipart, http::StatusCode};
use serde::Deserialize;
use shared::{Message, PrivateMessage};
use sqlx::PgPool;
use std::collections::HashMap;
use std::path::Path as StdPath;
use tokio::fs;

#[derive(Deserialize)]
pub struct SendMessage {
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[serde(rename = "senderId")]
    pub sender_id: String,
    pub content: String,
    #[serde(rename = "replyToId")]
    pub reply_to_id: Option<String>,
}

#[derive(Deserialize)]
pub struct SendPrivateMessage {
    #[serde(rename = "senderId")]
    pub sender_id: String,
    #[serde(rename = "receiverId")]
    pub receiver_id: String,
    pub content: String,
    #[serde(rename = "replyToId")]
    pub reply_to_id: Option<String>,
}

pub async fn get_messages(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<ApiResponse<Vec<Message>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let q = if let Some(pid) = params.get("projectId") {
        sqlx::query_as::<_, Message>(
            "SELECT * FROM messages WHERE projectId = $1 ORDER BY createdAt ASC",
        )
        .bind(pid)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, Message>(
            "SELECT * FROM messages WHERE projectId IS NULL ORDER BY createdAt ASC",
        )
        .fetch_all(&pool)
        .await
    };
    api_response(q.map_err(|e| e.to_string()))
}

pub async fn save_message(
    State(pool): State<PgPool>,
    Json(payload): Json<SendMessage>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let q = "INSERT INTO messages (id, projectId, senderId, content, replyToId, createdAt) VALUES ($1, $2, $3, $4, $5, $6)";
    api_response(
        sqlx::query(q)
            .bind(&id)
            .bind(payload.project_id)
            .bind(payload.sender_id)
            .bind(payload.content)
            .bind(payload.reply_to_id)
            .bind(created_at)
            .execute(&pool)
            .await
            .map(|_| id)
            .map_err(|e| e.to_string()),
    )
}

pub async fn delete_message(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query("DELETE FROM messages WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

pub async fn get_private_messages(
    State(pool): State<PgPool>,
    Path((u1, u2)): Path<(String, String)>,
) -> Result<Json<ApiResponse<Vec<PrivateMessage>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let q = "SELECT * FROM private_messages WHERE (senderId = $1 AND receiverId = $2) OR (senderId = $3 AND receiverId = $4) ORDER BY createdAt ASC";
    api_response(
        sqlx::query_as::<_, PrivateMessage>(q)
            .bind(&u1)
            .bind(&u2)
            .bind(&u2)
            .bind(&u1)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string()),
    )
}

pub async fn save_private_message(
    State(pool): State<PgPool>,
    Json(payload): Json<SendPrivateMessage>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let q = "INSERT INTO private_messages (id, senderId, receiverId, content, replyToId, createdAt) VALUES ($1, $2, $3, $4, $5, $6)";
    api_response(
        sqlx::query(q)
            .bind(&id)
            .bind(payload.sender_id)
            .bind(payload.receiver_id)
            .bind(payload.content)
            .bind(payload.reply_to_id)
            .bind(created_at)
            .execute(&pool)
            .await
            .map(|_| id)
            .map_err(|e| e.to_string()),
    )
}

pub async fn delete_private_message(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query("DELETE FROM private_messages WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

// Dummy endpoints to keep React happy until implemented
// 🔥 THE REAL NOTIFICATION ENGINE
pub async fn check_notifications(
    State(pool): State<PgPool>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<ApiResponse<i32>> {
    let user_id = params.get("userId").cloned().unwrap_or_default();
    let last_checked: i64 = params
        .get("lastChecked")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    // 1. Count unread Global & Project messages (excluding ones you sent yourself)
    let global_query = "SELECT COUNT(*) FROM messages WHERE senderId != $1 AND createdAt > $2";
    let global_count: (i32,) = sqlx::query_as(global_query)
        .bind(&user_id)
        .bind(last_checked)
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    // 2. Count unread Direct Messages (specifically sent to you)
    let dm_query = "SELECT COUNT(*) FROM private_messages WHERE receiverId = $1 AND createdAt > $2";
    let dm_count: (i32,) = sqlx::query_as(dm_query)
        .bind(&user_id)
        .bind(last_checked)
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    // Combine them!
    let total_unread = global_count.0 + dm_count.0;

    Json(ApiResponse {
        success: true,
        data: Some(total_unread),
        error: None,
    })
}
pub async fn get_kanban_tasks() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse {
        success: true,
        data: Some(vec![]),
        error: None,
    })
}
// SECURE CHAT ATTACHMENT UPLOAD
pub async fn upload_chat_file(
    mut multipart: Multipart,
) -> Result<
    Json<crate::routes::ApiResponse<String>>,
    (StatusCode, Json<crate::routes::ApiResponse<()>>),
> {
    let root_dir = crate::get_openprix_dir();
    let safe_dir = root_dir.join("chat_uploads");

    println!("DEBUG: Chat upload triggered. Target dir: {:?}", safe_dir);

    // 1. Ensure directory exists with better error reporting
    if let Err(e) = fs::create_dir_all(&safe_dir).await {
        eprintln!("ERROR: Failed to create chat_uploads directory: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::routes::ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Filesystem error: {}", e)),
            }),
        ));
    }

    let mut saved_paths = Vec::new();

    // 2. Parse Multipart fields
    while let Ok(Some(field)) = multipart.next_field().await {
        let original_name = field.file_name().unwrap_or("untitled").to_string();

        // Sanitize path
        let safe_name = StdPath::new(&original_name)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if safe_name.is_empty() {
            continue;
        }

        let ext = StdPath::new(&safe_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        // Security Whitelist
        let allowed_extensions = [
            "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx", "jpg", "jpeg", "png",
            "webp", "gif", "mp4", "mov", "avi", "dwg", "dxf", "rvt", "skp", "etb", "md",
        ];

        if !allowed_extensions.contains(&ext.as_str()) {
            println!("DEBUG: Rejected file extension: .{}", ext);
            continue;
        }

        // Generate unique filename
        let unique_name = format!(
            "{}_{}",
            uuid::Uuid::new_v4()
                .to_string()
                .chars()
                .take(8)
                .collect::<String>(),
            safe_name
        );
        let dest_path = safe_dir.join(&unique_name);

        println!("DEBUG: Writing file to: {:?}", dest_path);

        // 3. Write binary data
        match field.bytes().await {
            Ok(data) => {
                if let Err(e) = fs::write(&dest_path, &data).await {
                    eprintln!("ERROR: Failed to write file to disk: {}", e);
                    continue;
                }
                saved_paths.push(dest_path.to_string_lossy().replace("\\", "/"));
            }
            Err(e) => {
                eprintln!("ERROR: Failed to read multipart bytes: {}", e);
            }
        }
    }

    if saved_paths.is_empty() {
        println!("DEBUG: Upload finished but no files were saved.");
        return crate::routes::api_response(Err("No valid files uploaded.".to_string()));
    }

    crate::routes::api_response(Ok(saved_paths.join(",")))
}

