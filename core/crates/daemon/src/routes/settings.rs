use crate::{routes::ApiResponse, routes::api_response};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use serde_json::Value;
use shared::AppSetting;
use sqlx::PgPool; // 👈 Import the helper

#[derive(Deserialize)]
pub struct SaveSettingPayload {
    pub value: Value,
}

pub async fn get_settings(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<()>>)> {
    let res = sqlx::query_as::<_, AppSetting>("SELECT * FROM app_settings WHERE key = $1")
        .bind(key)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string());

    match res {
        // 🚀 No macro! Just direct JSON return
        Ok(Some(row)) => Ok(Json(ApiResponse {
            success: true,
            data: Some(serde_json::from_str(&row.value).unwrap_or(Value::Null)),
            error: None,
        })),
        Ok(None) => Ok(Json(ApiResponse {
            success: true,
            data: Some(Value::Null),
            error: None,
        })),
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

pub async fn save_settings(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
    Json(payload): Json<SaveSettingPayload>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let val_str = match payload.value {
        Value::String(s) => s,
        _ => payload.value.to_string(),
    };

    // 🚀 Using the new helper function
    api_response(
        sqlx::query("INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
            .bind(key)
            .bind(val_str)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}
