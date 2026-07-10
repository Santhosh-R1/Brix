use crate::{routes::ApiResponse, routes::api_response};
use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use shared::{Project, ProjectDocument};
use sqlx::{QueryBuilder, PgPool};
use std::path::Path as StdPath;
use tokio::fs;

// 🔥 IMPORT AMMONIA FOR XSS PROTECTION
use ammonia::clean;

// 🔥 HELPER: Safely sanitize optional strings
fn sanitize_opt(input: Option<String>) -> Option<String> {
    input.map(|s| clean(&s))
}

#[derive(Deserialize)]
pub struct CreateProject {
    pub name: String,
    pub code: Option<String>,
    #[serde(rename = "clientName")]
    pub client_name: Option<String>,
    pub status: Option<String>,
    pub region: Option<String>,
    #[serde(rename = "type")]
    pub project_type: Option<String>,
    pub location: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateProject {
    pub name: Option<String>,
    pub code: Option<String>,
    #[serde(rename = "clientName")]
    pub client_name: Option<String>,
    pub status: Option<String>,
    pub region: Option<String>,
    #[serde(rename = "projectLead")]
    pub project_lead: Option<String>,
    #[serde(rename = "siteSupervisor")]
    pub site_supervisor: Option<String>,
    pub pmc: Option<String>,
    pub architect: Option<String>,
    #[serde(rename = "structuralEngineer")]
    pub structural_engineer: Option<String>,
    #[serde(rename = "isPriceLocked")]
    pub is_price_locked: Option<i64>,
    #[serde(rename = "dailyLogs")]
    pub daily_logs: Option<String>,
    #[serde(rename = "actualResources")]
    pub actual_resources: Option<String>,
    #[serde(rename = "ganttTasks")]
    pub gantt_tasks: Option<String>,
    pub subcontractors: Option<String>,
    #[serde(rename = "phaseAssignments")]
    pub phase_assignments: Option<String>,
    #[serde(rename = "raBills")]
    pub ra_bills: Option<String>,
    #[serde(rename = "purchaseOrders")]
    pub purchase_orders: Option<String>,
    #[serde(rename = "materialRequests")]
    pub material_requests: Option<String>,
    pub grns: Option<String>,
    #[serde(rename = "type")]
    pub project_type: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "isScaffolded")]
    pub is_scaffolded: Option<i64>,
    #[serde(rename = "scaffoldPath")]
    pub scaffold_path: Option<String>,
    #[serde(rename = "isManuallyLinked")]
    pub is_manually_linked: Option<i64>,
    #[serde(rename = "dailySchedules")]
    pub daily_schedules: Option<String>,
    #[serde(rename = "resourceTrackingMode")]
    pub resource_tracking_mode: Option<String>,
    #[serde(rename = "assignedStaff")]
    pub assigned_staff: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateDocument {
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub name: String,
    pub category: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "fileType")]
    pub file_type: String,
}

pub async fn get_projects(
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<Project>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query_as::<_, Project>("SELECT * FROM projects")
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string()),
    )
}

pub async fn get_project(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<Project>>, (StatusCode, Json<ApiResponse<()>>)> {
    match sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())
    {
        Ok(Some(p)) => Ok(Json(ApiResponse {
            success: true,
            data: Some(p),
            error: None,
        })),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some("Not found".into()),
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(e),
            }),
        )),
    }
}

pub async fn add_project(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateProject>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let q = "INSERT INTO projects (id, name, code, clientName, status, region, type, location, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    api_response(
        sqlx::query(q)
            .bind(&id)
            .bind(clean(&payload.name)) // 🔥 Strict sanitization applied
            .bind(sanitize_opt(payload.code))
            .bind(sanitize_opt(payload.client_name))
            .bind(sanitize_opt(payload.status).unwrap_or_else(|| "Active".to_string()))
            .bind(sanitize_opt(payload.region))
            .bind(sanitize_opt(payload.project_type))
            .bind(sanitize_opt(payload.location))
            .bind(created_at)
            .execute(&pool)
            .await
            .map(|_| id)
            .map_err(|e| e.to_string()),
    )
}

pub async fn update_project(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProject>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut qb: QueryBuilder<sqlx::Postgres> = QueryBuilder::new("UPDATE projects SET ");
    let mut has_fields = false;

    // 🔥 Sanitize plain text fields to prevent XSS injection
    if let Some(v) = payload.name {
        qb.push("name = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.code {
        if has_fields {
            qb.push(", ");
        }
        qb.push("code = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.client_name {
        if has_fields {
            qb.push(", ");
        }
        qb.push("clientName = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.status {
        if has_fields {
            qb.push(", ");
        }
        qb.push("status = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.region {
        if has_fields {
            qb.push(", ");
        }
        qb.push("region = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.project_lead {
        if has_fields {
            qb.push(", ");
        }
        qb.push("projectLead = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.site_supervisor {
        if has_fields {
            qb.push(", ");
        }
        qb.push("siteSupervisor = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.pmc {
        if has_fields {
            qb.push(", ");
        }
        qb.push("pmc = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.architect {
        if has_fields {
            qb.push(", ");
        }
        qb.push("architect = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.structural_engineer {
        if has_fields {
            qb.push(", ");
        }
        qb.push("structuralEngineer = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.project_type {
        if has_fields {
            qb.push(", ");
        }
        qb.push("type = ").push_bind(clean(&v));
        has_fields = true;
    }
    if let Some(v) = payload.location {
        if has_fields {
            qb.push(", ");
        }
        qb.push("location = ").push_bind(clean(&v));
        has_fields = true;
    }

    // ⚠️ DO NOT run ammonia on structured JSON blobs or system paths, as escaping quotes will break the frontend parsers
    if let Some(v) = payload.daily_logs {
        if has_fields {
            qb.push(", ");
        }
        qb.push("dailyLogs = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.actual_resources {
        if has_fields {
            qb.push(", ");
        }
        qb.push("actualResources = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.gantt_tasks {
        if has_fields {
            qb.push(", ");
        }
        qb.push("ganttTasks = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.subcontractors {
        if has_fields {
            qb.push(", ");
        }
        qb.push("subcontractors = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.phase_assignments {
        if has_fields {
            qb.push(", ");
        }
        qb.push("phaseAssignments = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.ra_bills {
        if has_fields {
            qb.push(", ");
        }
        qb.push("raBills = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.purchase_orders {
        if has_fields {
            qb.push(", ");
        }
        qb.push("purchaseOrders = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.material_requests {
        if has_fields {
            qb.push(", ");
        }
        qb.push("materialRequests = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.grns {
        if has_fields {
            qb.push(", ");
        }
        qb.push("grns = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.scaffold_path {
        if has_fields {
            qb.push(", ");
        }
        qb.push("scaffoldPath = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.daily_schedules {
        if has_fields {
            qb.push(", ");
        }
        qb.push("dailySchedules = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.resource_tracking_mode {
        if has_fields {
            qb.push(", ");
        }
        qb.push("resourceTrackingMode = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.assigned_staff {
        if has_fields {
            qb.push(", ");
        }
        qb.push("assignedStaff = ").push_bind(v);
        has_fields = true;
    }

    // Numbers are inherently safe
    if let Some(v) = payload.is_price_locked {
        if has_fields {
            qb.push(", ");
        }
        qb.push("isPriceLocked = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.is_scaffolded {
        if has_fields {
            qb.push(", ");
        }
        qb.push("isScaffolded = ").push_bind(v);
        has_fields = true;
    }
    if let Some(v) = payload.is_manually_linked {
        if has_fields {
            qb.push(", ");
        }
        qb.push("isManuallyLinked = ").push_bind(v);
        has_fields = true;
    }

    if !has_fields {
        return Ok(Json(ApiResponse {
            success: true,
            data: Some(true),
            error: None,
        }));
    }
    qb.push(" WHERE id = ").push_bind(id);
    api_response(
        qb.build()
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

pub async fn delete_project(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return api_response(Err(e.to_string())),
    };
    let _ = sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM project_boq WHERE projectId = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM project_documents WHERE projectId = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await;
    api_response(tx.commit().await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn purge_projects(
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return api_response(Err(e.to_string())),
    };
    let _ = sqlx::query("DELETE FROM projects").execute(&mut *tx).await;
    let _ = sqlx::query("DELETE FROM project_boq")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM project_documents")
        .execute(&mut *tx)
        .await;
    api_response(tx.commit().await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn get_project_docs(
    State(pool): State<PgPool>,
    Path(pid): Path<String>,
) -> Result<Json<ApiResponse<Vec<ProjectDocument>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query_as::<_, ProjectDocument>(
            "SELECT * FROM project_documents WHERE projectId = $1 ORDER BY addedAt DESC",
        )
        .bind(pid)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string()),
    )
}

pub async fn save_project_doc(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateDocument>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let added_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let q = "INSERT INTO project_documents (id, projectId, name, category, filePath, fileType, addedAt) VALUES ($1, $2, $3, $4, $5, $6, $7)";
    api_response(
        sqlx::query(q)
            .bind(&id)
            .bind(payload.project_id)
            .bind(clean(&payload.name)) // 🔥 Strict sanitization applied
            .bind(clean(&payload.category)) // 🔥 Strict sanitization applied
            .bind(payload.file_path) // Path is generated server-side, safe
            .bind(payload.file_type) // Extension is vetted server-side, safe
            .bind(added_at)
            .execute(&pool)
            .await
            .map(|_| id)
            .map_err(|e| e.to_string()),
    )
}

pub async fn delete_project_doc(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query("DELETE FROM project_documents WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

// 🔥 SECURE SANDBOXED UPLOAD FOR REMOTE CLIENTS
pub async fn upload_project_document(
    Path(project_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let root_dir = crate::get_openprix_dir();
    let safe_dir = root_dir.join("project_docs").join(&project_id);

    // Ensure the project-specific upload directory exists
    if let Err(e) = fs::create_dir_all(&safe_dir).await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Directory error: {}", e)),
            }),
        ));
    }

    let mut saved_paths = Vec::new();

    // Iterate over multipart stream
    while let Ok(Some(field)) = multipart.next_field().await {
        let original_name = field.file_name().unwrap_or("untitled").to_string();

        // Sanitize to prevent Directory Traversal
        let safe_name = StdPath::new(&original_name)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if safe_name.is_empty() {
            continue;
        }

        // 🔥 THE WHITELIST PROTOCOL
        let ext = StdPath::new(&safe_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let allowed_extensions = [
            // Documents & Spreadsheets
            "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
            // Images & Video
            "jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "avi",
            // Engineering & CAD
            "dwg", "dxf", "rvt", "skp", "etb",
        ];

        if !allowed_extensions.contains(&ext.as_str()) {
            eprintln!("SECURITY: Rejected unauthorized file type: {}", ext);
            continue;
        }

        let dest_path = safe_dir.join(&safe_name);

        // Handle bytes safely (ONLY ONCE!)
        match field.bytes().await {
            Ok(data) => {
                if let Err(e) = fs::write(&dest_path, &data).await {
                    eprintln!("Failed to write file to disk: {}", e);
                } else {
                    saved_paths.push(dest_path.to_string_lossy().replace("\\", "/"));
                }
            }
            Err(e) => {
                eprintln!("Failed to read multipart chunk from remote client: {}", e);
            }
        }
    }

    if saved_paths.is_empty() {
        return api_response(Err(
            "No valid files were uploaded. Check server terminal for stream disconnects."
                .to_string(),
        ));
    }

    api_response(Ok(saved_paths.join(",")))
}
