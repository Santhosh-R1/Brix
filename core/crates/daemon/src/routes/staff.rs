#![allow(non_snake_case)]

use crate::routes::{ApiResponse, api_response};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};

#[derive(Serialize, Deserialize, FromRow, Clone)]
#[sqlx(rename_all = "lowercase")]
pub struct Staff {
    pub id: String,
    pub name: String,
    pub designation: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub createdAt: Option<i64>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
    pub accessLevel: Option<i32>,
    pub globalPermissions: Option<String>,
}

pub async fn get_staff(
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<Staff>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let result = sqlx::query_as::<_, Staff>("SELECT * FROM org_staff")
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string());
    api_response(result)
}

pub async fn save_staff(
    State(pool): State<PgPool>,
    Json(payload): Json<Staff>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut final_password = payload.password.clone();
    if let Some(pw) = &payload.password {
        if !pw.is_empty() && !pw.starts_with("$2") {
            match bcrypt::hash(pw, bcrypt::DEFAULT_COST) {
                Ok(hashed) => final_password = Some(hashed),
                Err(_) => {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse {
                            success: false,
                            data: None,
                            error: Some("Password hashing failed".to_string()),
                        }),
                    ));
                }
            }
        }
    }

    let query = "
        INSERT INTO org_staff (id, name, designation, department, status, email, phone, createdAt, username, password, role, accessLevel, globalPermissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT(id) DO UPDATE SET
            name = EXCLUDED.name,
            designation = EXCLUDED.designation,
            department = EXCLUDED.department,
            status = EXCLUDED.status,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            username = EXCLUDED.username,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            accessLevel = EXCLUDED.accessLevel,
            globalPermissions = EXCLUDED.globalPermissions
    ";

    let result = sqlx::query(query)
        .bind(&payload.id)
        .bind(&payload.name)
        .bind(&payload.designation)
        .bind(&payload.department)
        .bind(&payload.status)
        .bind(&payload.email)
        .bind(&payload.phone)
        .bind(payload.createdAt)
        .bind(&payload.username)
        .bind(&final_password)
        .bind(&payload.role)
        .bind(payload.accessLevel)
        .bind(&payload.globalPermissions)
        .execute(&pool)
        .await
        .map(|_| payload.id)
        .map_err(|e| e.to_string());

    api_response(result)
}

pub async fn delete_staff(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let result = sqlx::query("DELETE FROM org_staff WHERE id = $1")
        .bind(&id)
        .execute(&pool)
        .await
        .map(|_| id)
        .map_err(|e| e.to_string());
    api_response(result)
}

// 🔥 Updated WorkLog Struct for Man-Hour Tracking
#[derive(Serialize, Deserialize, FromRow, Clone)]
#[serde(rename_all = "camelCase")]
#[sqlx(rename_all = "lowercase")]
pub struct WorkLog {
    pub id: String,
    pub date: Option<String>,
    pub staffId: Option<String>,
    pub slNo: Option<i64>,
    pub projectId: Option<String>,
    pub details: Option<String>,
    pub remarks: Option<String>,
    pub status: Option<String>,
    pub createdAt: Option<i64>,
    #[sqlx(rename = "duration_minutes")]
    pub durationMinutes: Option<i32>,
    #[sqlx(rename = "work_category")]
    pub workCategory: Option<String>,
}

pub async fn get_worklogs(
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<WorkLog>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let result = sqlx::query_as::<_, WorkLog>("SELECT * FROM staff_work_logs")
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string());
    api_response(result)
}

pub async fn save_worklog(
    State(pool): State<PgPool>,
    Json(payload): Json<WorkLog>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let query = "
        INSERT INTO staff_work_logs (id, date, staffId, slNo, projectId, details, remarks, status, createdAt, duration_minutes, work_category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ";

    let result = sqlx::query(query)
        .bind(&payload.id)
        .bind(&payload.date)
        .bind(&payload.staffId)
        .bind(payload.slNo)
        .bind(&payload.projectId)
        .bind(&payload.details)
        .bind(&payload.remarks)
        .bind(&payload.status)
        .bind(payload.createdAt)
        .bind(payload.durationMinutes.unwrap_or(0))
        .bind(&payload.workCategory)
        .execute(&pool)
        .await
        .map(|_| payload.id.clone())
        .map_err(|e| e.to_string());

    api_response(result)
}

pub async fn update_worklog(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<WorkLog>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let query = "
        UPDATE staff_work_logs SET
            date = $1, staffId = $2, slNo = $3, projectId = $4, 
            details = $5, remarks = $6, status = $7, 
            duration_minutes = $8, work_category = $9
        WHERE id = $10
    ";

    let result = sqlx::query(query)
        .bind(&payload.date)
        .bind(&payload.staffId)
        .bind(payload.slNo)
        .bind(&payload.projectId)
        .bind(&payload.details)
        .bind(&payload.remarks)
        .bind(&payload.status)
        .bind(payload.durationMinutes)
        .bind(&payload.workCategory)
        .bind(&id)
        .execute(&pool)
        .await
        .map(|_| id.clone())
        .map_err(|e| e.to_string());

    api_response(result)
}

pub async fn delete_worklog(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let result = sqlx::query("DELETE FROM staff_work_logs WHERE id = $1")
        .bind(&id)
        .execute(&pool)
        .await
        .map(|_| id.clone())
        .map_err(|e| e.to_string());
    api_response(result)
}

pub async fn get_project_man_hours(
    State(pool): State<PgPool>,
    Path(project_id): Path<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<()>>)> {
    let query = "
        SELECT work_category, SUM(duration_minutes) as total_mins
        FROM staff_work_logs
        WHERE projectId = $1
        GROUP BY work_category
    ";

    let rows = sqlx::query_as::<_, (String, i64)>(query)
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match rows {
        Ok(data) => {
            let formatted = data
                .into_iter()
                .map(|(cat, mins)| serde_json::json!({ "category": cat, "minutes": mins }))
                .collect::<Vec<_>>();
            api_response(Ok(serde_json::json!(formatted)))
        }
        Err(e) => api_response(Err(e.to_string())),
    }
}
