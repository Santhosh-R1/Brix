use axum::{Json, http::StatusCode};
use serde::Serialize;

pub mod auth;
pub mod boqs;
pub mod crm;
pub mod db;
pub mod messages;
pub mod os;
pub mod projects;
pub mod resources;
pub mod settings;
pub mod staff;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

// 🚀 THE NEW HELPER FUNCTION (Replaces the macro)
pub fn api_response<T>(
    result: Result<T, String>,
) -> Result<Json<ApiResponse<T>>, (StatusCode, Json<ApiResponse<()>>)> {
    match result {
        Ok(data) => Ok(Json(ApiResponse {
            success: true,
            data: Some(data),
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
