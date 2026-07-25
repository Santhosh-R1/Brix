use sqlx::postgres::PgPoolOptions;
#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/openprix".to_string());
    let pool = PgPoolOptions::new().connect(&db_url).await.unwrap();
    let queries = [
        "ALTER TABLE projects ALTER COLUMN ispricelocked TYPE BIGINT;",
        "ALTER TABLE projects ALTER COLUMN isscaffolded TYPE BIGINT;",
        "ALTER TABLE projects ALTER COLUMN ismanuallylinked TYPE BIGINT;",
        "ALTER TABLE project_boq ALTER COLUMN slno TYPE BIGINT;",
        "ALTER TABLE project_boq ALTER COLUMN iscustom TYPE BIGINT;",
        "ALTER TABLE staff_work_logs ALTER COLUMN slno TYPE BIGINT;"
    ];
    for q in queries {
        match sqlx::query(q).execute(&pool).await {
            Ok(_) => println!("Executed {}", q),
            Err(e) => println!("Error on {}: {:?}", q, e),
        }
    }
    println!("MIGRATION OK");
}
