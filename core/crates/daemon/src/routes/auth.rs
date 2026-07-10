use crate::routes::ApiResponse;
use axum::{Json, extract::State};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};

#[derive(Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserData,
}

#[derive(Serialize)]
pub struct UserData {
    pub id: String,
    pub name: String,
    pub role: String,
    pub access_level: i64,
    pub global_permissions: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub access_level: i64,
    pub exp: usize,
}

// 🔥 FIXED: Renamed fields to snake_case and added sqlx(rename) attributes
#[derive(FromRow)]
struct DbUser {
    id: String,
    name: Option<String>,
    password: Option<String>,
    role: Option<String>,
    #[sqlx(rename = "accessLevel")]
    access_level: Option<i64>,
    #[sqlx(rename = "globalPermissions")]
    global_permissions: Option<String>,
}

pub const JWT_SECRET: &[u8] = b"OPENPRIX_SUPER_SECRET_KEY_CHANGE_ME";

pub async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginPayload>,
) -> Json<ApiResponse<LoginResponse>> {
    let un = payload.username.trim().to_lowercase();

    let record = sqlx::query_as::<_, DbUser>(
        "SELECT id, name, password, role, accessLevel, globalPermissions FROM org_staff WHERE username = $1"
    )
    .bind(un)
    .fetch_optional(&pool)
    .await;

    match record {
        Ok(Some(row)) => {
            let provided_pw = payload.password.unwrap_or_default();
            let hashed_pw = row.password.unwrap_or_default();

            if bcrypt::verify(&provided_pw, &hashed_pw).unwrap_or(false) {
                let expiration = Utc::now()
                    .checked_add_signed(Duration::hours(24))
                    .expect("valid timestamp")
                    .timestamp() as usize;

                let claims = Claims {
                    sub: row.id.clone(),
                    access_level: row.access_level.unwrap_or(1), // Updated variable name
                    exp: expiration,
                };

                let token = encode(
                    &Header::default(),
                    &claims,
                    &EncodingKey::from_secret(JWT_SECRET),
                )
                .unwrap_or_default();

                Json(ApiResponse {
                    success: true,
                    data: Some(LoginResponse {
                        token,
                        user: UserData {
                            id: row.id,
                            name: row.name.unwrap_or_default(),
                            role: row.role.unwrap_or_else(|| "Staff".to_string()),
                            access_level: row.access_level.unwrap_or(1), // Updated variable name
                            global_permissions: row
                                .global_permissions
                                .unwrap_or_else(|| "[]".to_string()), // Updated variable name
                        },
                    }),
                    error: None,
                })
            } else {
                Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some("Invalid credentials".into()),
                })
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("User not found".into()),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}
