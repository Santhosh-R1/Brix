use axum::{extract::{Path, State}, http::StatusCode, Json};
use serde::Deserialize;
use sqlx::PgPool;
use shared::{Region, Resource};
use crate::{routes::ApiResponse, routes::api_response};

#[derive(Deserialize)]
pub struct CreateRegion { pub name: String }

#[derive(Deserialize)]
pub struct SaveResource {
    pub id: Option<String>,
    pub code: String,
    pub description: String,
    pub unit: String,
    pub rates: Option<String>,
    #[serde(rename = "rateHistory")] pub rate_history: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateResourceField { pub field: String, pub value: String } // Used for quick rate updates

pub async fn get_regions(State(pool): State<PgPool>) -> Result<Json<ApiResponse<Vec<Region>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query_as::<_, Region>("SELECT * FROM regions ORDER BY name ASC").fetch_all(&pool).await.map_err(|e| e.to_string()))
}

pub async fn save_region(State(pool): State<PgPool>, Json(payload): Json<CreateRegion>) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    api_response(sqlx::query("INSERT INTO regions (id, name) VALUES ($1, $2)").bind(&id).bind(payload.name).execute(&pool).await.map(|_| id).map_err(|e| e.to_string()))
}

pub async fn delete_region(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query("DELETE FROM regions WHERE id = $1").bind(id).execute(&pool).await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn get_resources(State(pool): State<PgPool>) -> Result<Json<ApiResponse<Vec<Resource>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query_as::<_, Resource>("SELECT * FROM resources ORDER BY code ASC").fetch_all(&pool).await.map_err(|e| e.to_string()))
}

pub async fn save_resource(State(pool): State<PgPool>, Json(payload): Json<SaveResource>) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = payload.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let q = "INSERT INTO resources (id, code, description, unit, rates, rateHistory) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, description = EXCLUDED.description, unit = EXCLUDED.unit, rates = EXCLUDED.rates, rateHistory = EXCLUDED.rateHistory";
    api_response(sqlx::query(q).bind(&id).bind(payload.code).bind(payload.description).bind(payload.unit).bind(payload.rates.unwrap_or_else(|| "{}".into())).bind(payload.rate_history.unwrap_or_else(|| "[]".into()))
        .execute(&pool).await.map(|_| id).map_err(|e| e.to_string()))
}

pub async fn update_resource(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpdateResourceField>) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    // Validates column names strictly for dynamic field updates
    let allowed_fields = ["code", "description", "unit", "rates", "rateHistory"];
    if !allowed_fields.contains(&payload.field.as_str()) { return Err((StatusCode::BAD_REQUEST, Json(ApiResponse { success: false, data: None, error: Some("Invalid field".into()) }))); }
    let q = format!("UPDATE resources SET {} = $1 WHERE id = $2", payload.field);
    api_response(sqlx::query(&q).bind(payload.value).bind(id).execute(&pool).await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn delete_resource(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(sqlx::query("DELETE FROM resources WHERE id = $1").bind(id).execute(&pool).await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn bulk_save_resources(State(pool): State<PgPool>, Json(payload): Json<Vec<SaveResource>>) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return api_response(Err(e.to_string())),
    };
    for item in payload {
        let id = item.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let q = "INSERT INTO resources (id, code, description, unit, rates, rateHistory) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, description = EXCLUDED.description, unit = EXCLUDED.unit, rates = EXCLUDED.rates, rateHistory = EXCLUDED.rateHistory";
        let res = sqlx::query(q)
            .bind(&id)
            .bind(item.code)
            .bind(item.description)
            .bind(item.unit)
            .bind(item.rates.unwrap_or_else(|| "{}".into()))
            .bind(item.rate_history.unwrap_or_else(|| "[]".into()))
            .execute(&mut *tx)
            .await;
        if let Err(e) = res {
            let _ = tx.rollback().await;
            return api_response(Err(e.to_string()));
        }
    }
    api_response(tx.commit().await.map(|_| true).map_err(|e| e.to_string()))
}