use crate::{routes::ApiResponse, routes::api_response};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use shared::{MasterBoq, ProjectBoq};
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct CreateProjectBoq {
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "masterBoqId")]
    pub master_boq_id: Option<String>,
    #[serde(rename = "slNo", deserialize_with = "number_to_i64", default)]
    pub sl_no: i64,
    #[serde(rename = "isCustom", deserialize_with = "bool_or_int", default)]
    pub is_custom: i64,
    #[serde(rename = "itemCode")]
    pub item_code: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub rate: Option<f64>,
    pub qty: Option<f64>,
    #[serde(rename = "formulaStr")]
    pub formula_str: Option<String>,
    pub measurements: Option<String>,
    pub phase: Option<String>,
    #[serde(rename = "lockedRate")]
    pub locked_rate: Option<f64>,
}

fn bool_or_int<'de, D: serde::Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
    use serde::Deserialize;
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum BoolOrInt {
        Bool(bool),
        Int(i64),
    }
    match BoolOrInt::deserialize(d)? {
        BoolOrInt::Bool(b) => Ok(if b { 1 } else { 0 }),
        BoolOrInt::Int(n) => Ok(n),
    }
}

fn number_to_i64<'de, D: serde::Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
    use serde::Deserialize;
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Num {
        Int(i64),
        Float(f64),
    }
    match Num::deserialize(d)? {
        Num::Int(n) => Ok(n),
        Num::Float(f) => Ok(f as i64),
    }
}

#[derive(Deserialize)]
pub struct BulkBoqItem {
    pub id: String,
    #[serde(rename = "lockedRate")]
    pub locked_rate: Option<f64>,
}
#[derive(Deserialize)]
pub struct BulkBoqPayload {
    pub items: Vec<BulkBoqItem>,
}

#[derive(Deserialize)]
pub struct SaveMasterBoq {
    pub id: Option<String>,
    #[serde(rename = "isNew")]
    pub is_new: bool,
    pub payload: MasterBoqPayload,
}
#[derive(Deserialize)]
pub struct MasterBoqPayload {
    #[serde(rename = "itemCode")]
    pub item_code: String,
    pub description: String,
    pub unit: String,
    pub overhead: Option<f64>,
    pub profit: Option<f64>,
    pub components: Option<String>,
}

pub async fn get_project_boqs(
    State(pool): State<PgPool>,
    Path(pid): Path<String>,
) -> Result<Json<ApiResponse<Vec<ProjectBoq>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query_as::<_, ProjectBoq>("SELECT * FROM project_boq WHERE projectId = $1")
            .bind(pid)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string()),
    )
}

pub async fn add_project_boq(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateProjectBoq>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let q = "INSERT INTO project_boq (id, projectId, masterBoqId, slNo, isCustom, itemCode, description, unit, rate, qty, formulaStr, measurements, phase, lockedRate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)";
    api_response(
        sqlx::query(q)
            .bind(&id)
            .bind(payload.project_id)
            .bind(payload.master_boq_id)
            .bind(payload.sl_no)
            .bind(payload.is_custom)
            .bind(payload.item_code)
            .bind(payload.description)
            .bind(payload.unit)
            .bind(payload.rate)
            .bind(payload.qty)
            .bind(payload.formula_str)
            .bind(payload.measurements.unwrap_or_else(|| "[]".to_string()))
            .bind(payload.phase)
            .bind(payload.locked_rate)
            .execute(&pool)
            .await
            .map(|_| id)
            .map_err(|e| e.to_string()),
    )
}

pub async fn update_project_boq(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<std::collections::HashMap<String, serde_json::Value>>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    // Allowed columns for safe partial update
    let allowed = [
        "slNo",
        "isCustom",
        "itemCode",
        "description",
        "unit",
        "rate",
        "qty",
        "formulaStr",
        "measurements",
        "phase",
        "lockedRate",
        "masterBoqId",
        "projectId",
    ];

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();
    let mut param_idx = 1;

    for (key, val) in &payload {
        if !allowed.contains(&key.as_str()) {
            continue;
        }
        let cast = match key.as_str() {
            "slNo" | "isCustom" => "::bigint",
            "rate" | "qty" | "lockedRate" => "::double precision",
            _ => "",
        };
        sets.push(format!("{} = CAST(${} AS TEXT){}", key, param_idx, cast));
        param_idx += 1;
        match val {
            serde_json::Value::Null => values.push("__NULL__".to_string()),
            serde_json::Value::Bool(b) => {
                values.push(if *b { "1".to_string() } else { "0".to_string() })
            }
            serde_json::Value::Number(n) => values.push(n.to_string()),
            serde_json::Value::String(s) => values.push(s.clone()),
            // Arrays/objects must be JSON-stringified client-side but handle gracefully
            other => values.push(other.to_string()),
        }
    }

    if sets.is_empty() {
        return api_response(Ok(true));
    }

    let q = format!("UPDATE project_boq SET {} WHERE id = ${}", sets.join(", "), param_idx);
    let mut query = sqlx::query(&q);
    for val in &values {
        if val == "__NULL__" {
            query = query.bind(None::<String>);
        } else {
            query = query.bind(val.clone());
        }
    }
    api_response(
        query
            .bind(&id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

pub async fn delete_project_boq(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query("DELETE FROM project_boq WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}

pub async fn bulk_put_project_boqs(
    State(pool): State<PgPool>,
    Json(payload): Json<BulkBoqPayload>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => return api_response(Err(e.to_string())),
    };
    for item in payload.items {
        let _ = sqlx::query("UPDATE project_boq SET lockedRate = $1 WHERE id = $2")
            .bind(item.locked_rate)
            .bind(item.id)
            .execute(&mut *tx)
            .await;
    }
    api_response(tx.commit().await.map(|_| true).map_err(|e| e.to_string()))
}

pub async fn get_master_boqs(
    State(pool): State<PgPool>,
) -> Result<Json<ApiResponse<Vec<MasterBoq>>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query_as::<_, MasterBoq>("SELECT * FROM master_boq")
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string()),
    )
}

pub async fn save_master_boq(
    State(pool): State<PgPool>,
    Json(data): Json<SaveMasterBoq>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<()>>)> {
    let p = data.payload;

    // 1. If we have an ID and we are NOT saving as new, do a standard UPDATE.
    if let Some(id) = &data.id {
        if !data.is_new {
            return api_response(sqlx::query("UPDATE master_boq SET itemCode=$1, description=$2, unit=$3, overhead=$4, profit=$5, components=$6 WHERE id=$7")
                .bind(&p.item_code).bind(&p.description).bind(&p.unit).bind(p.overhead).bind(p.profit).bind(p.components.unwrap_or_else(|| "[]".into())).bind(id)
                .execute(&pool).await.map(|_| id.clone()).map_err(|e| e.to_string()));
        }
    }

    // 2. 🔥 THE FIX: If is_new is true, FORCE a new UUID, even if the frontend accidentally sent the old one!
    let insert_id = if data.is_new {
        uuid::Uuid::new_v4().to_string()
    } else {
        data.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string())
    };

    api_response(sqlx::query("INSERT INTO master_boq (id, itemCode, description, unit, overhead, profit, components) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(&insert_id).bind(&p.item_code).bind(&p.description).bind(&p.unit).bind(p.overhead).bind(p.profit).bind(p.components.unwrap_or_else(|| "[]".into()))
        .execute(&pool).await.map(|_| insert_id).map_err(|e| e.to_string()))
}

pub async fn delete_master_boq(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiResponse<()>>)> {
    api_response(
        sqlx::query("DELETE FROM master_boq WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .map(|_| true)
            .map_err(|e| e.to_string()),
    )
}
