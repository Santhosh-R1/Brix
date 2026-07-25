use axum::{extract::{Path, State}, http::StatusCode, Json};
use serde::Deserialize;
use sqlx::PgPool;
use shared::CrmContact;
use crate::{routes::ApiResponse, routes::api_response};

#[derive(Deserialize)]
pub struct CreateCrmPayload {
    pub name: String,
    pub company: Option<String>,
    #[serde(rename = "type")] pub contact_type: Option<String>,
    pub status: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

pub async fn get_crm(State(pool): State<PgPool>) -> Result<Json<ApiResponse<Vec<CrmContact>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query_as::<_, CrmContact>("SELECT * FROM crm_contacts").fetch_all(&pool).await.map_err(|e| e.to_string()))
}

pub async fn save_crm(State(pool): State<PgPool>, Json(payload): Json<CreateCrmPayload>) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
    
    let q = "INSERT INTO crm_contacts (id, name, company, type, status, email, phone, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    api_response(sqlx::query(q)
        .bind(&id).bind(payload.name).bind(payload.company).bind(payload.contact_type)
        .bind(payload.status).bind(payload.email).bind(payload.phone).bind(created_at)
        .execute(&pool).await.map(|_| id).map_err(|e| e.to_string()))
}

pub async fn delete_crm(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query("DELETE FROM crm_contacts WHERE id = $1").bind(id).execute(&pool).await.map(|_| true).map_err(|e| e.to_string()))
}