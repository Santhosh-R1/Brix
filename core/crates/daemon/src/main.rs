// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::routes::auth::{Claims, JWT_SECRET};
use axum::extract::ConnectInfo;
use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{Method, StatusCode, Uri, header},
    response::IntoResponse,
    routing::{delete, get, post, put},
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use rust_embed::RustEmbed;
use serde_json::Value;
use shared::DaemonStatus;
use sqlx::{
    PgPool,
    postgres::{PgConnectOptions, PgPoolOptions},
};
use std::str::FromStr;
use std::{fs, net::SocketAddr, process};
use tower_http::cors::CorsLayer;

// Tray & Event Loop Imports
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tray_icon::{
    Icon, TrayIconBuilder,
    menu::{Menu, MenuEvent, MenuItem},
};

mod routes;

#[derive(RustEmbed)]
#[folder = "../../../dist/"]
struct Assets;

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let mut path = uri.path().trim_start_matches('/');
    if path.is_empty() {
        path = "index.html";
    }

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => {
            if let Some(index) = Assets::get("index.html") {
                ([(header::CONTENT_TYPE, "text/html")], index.data).into_response()
            } else {
                (StatusCode::NOT_FOUND, "404 Not Found").into_response()
            }
        }
    }
}

pub fn get_openprix_dir() -> std::path::PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let dir = std::path::Path::new(&home).join(".openprix");
    std::fs::create_dir_all(&dir).unwrap_or_default();
    dir
}

async fn init_db(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let schema = "
        CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, code TEXT, clientName TEXT, status TEXT, region TEXT, projectLead TEXT, siteSupervisor TEXT, pmc TEXT, architect TEXT, structuralEngineer TEXT, isPriceLocked INTEGER, dailyLogs TEXT, actualResources TEXT, ganttTasks TEXT, subcontractors TEXT, phaseAssignments TEXT, createdAt INTEGER, raBills TEXT, purchaseOrders TEXT, materialRequests TEXT, grns TEXT, type TEXT, location TEXT, isScaffolded INTEGER, scaffoldPath TEXT, isManuallyLinked INTEGER, dailySchedules TEXT, resourceTrackingMode TEXT, assignedStaff TEXT);
        CREATE TABLE IF NOT EXISTS project_boq (id TEXT PRIMARY KEY, projectId TEXT, masterBoqId TEXT, slNo INTEGER, isCustom INTEGER, itemCode TEXT, description TEXT, unit TEXT, rate REAL, formulaStr TEXT, qty REAL, measurements TEXT, phase TEXT, lockedRate REAL);
        CREATE TABLE IF NOT EXISTS master_boq (id TEXT PRIMARY KEY, itemCode TEXT, description TEXT, unit TEXT, overhead REAL, profit REAL, components TEXT);
        CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, code TEXT, description TEXT, unit TEXT, rates TEXT, rateHistory TEXT);
        CREATE TABLE IF NOT EXISTS regions (id TEXT PRIMARY KEY, name TEXT);
        CREATE TABLE IF NOT EXISTS crm_contacts (id TEXT PRIMARY KEY, name TEXT, company TEXT, type TEXT, status TEXT, email TEXT, phone TEXT, createdAt INTEGER);
        CREATE TABLE IF NOT EXISTS org_staff (id TEXT PRIMARY KEY, name TEXT, designation TEXT, department TEXT, status TEXT, email TEXT, phone TEXT, createdAt INTEGER, username TEXT, password TEXT, role TEXT, accessLevel INTEGER, globalPermissions TEXT);
        CREATE TABLE IF NOT EXISTS staff_work_logs (id TEXT PRIMARY KEY, date TEXT, staffId TEXT, slNo INTEGER, projectId TEXT, details TEXT, remarks TEXT, status TEXT, createdAt INTEGER, duration_minutes INTEGER, work_category TEXT);
        CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, projectId TEXT, senderId TEXT, content TEXT, replyToId TEXT, createdAt INTEGER);
        CREATE TABLE IF NOT EXISTS private_messages (id TEXT PRIMARY KEY, senderId TEXT, receiverId TEXT, content TEXT, replyToId TEXT, createdAt INTEGER);
        CREATE TABLE IF NOT EXISTS project_documents (id TEXT PRIMARY KEY, projectId TEXT, name TEXT, category TEXT, filePath TEXT, fileType TEXT, addedAt INTEGER);
    ";

    sqlx::query(schema).execute(pool).await?;

    let _ =
        sqlx::query("ALTER TABLE staff_work_logs ADD COLUMN duration_minutes INTEGER DEFAULT 0;")
            .execute(pool)
            .await;
    let _ = sqlx::query("ALTER TABLE staff_work_logs ADD COLUMN work_category TEXT;")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE org_staff ADD COLUMN globalPermissions TEXT;")
        .execute(pool)
        .await;

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM org_staff")
        .fetch_one(pool)
        .await?;

    if count.0 == 0 {
        let admin_insert = "
            INSERT INTO org_staff (id, name, designation, department, status, email, phone, createdAt, username, password, role, accessLevel, globalPermissions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ";
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        let hashed_pw = bcrypt::hash("admin123", bcrypt::DEFAULT_COST).unwrap_or_default();

        sqlx::query(admin_insert)
            .bind("admin_id")
            .bind("Administrator")
            .bind("System Admin")
            .bind("Management")
            .bind("Active")
            .bind("admin@example.com")
            .bind("")
            .bind(now)
            .bind("admin")
            .bind(hashed_pw)
            .bind("Admin")
            .bind(5)
            .bind("[]")
            .execute(pool)
            .await?;
        println!("Default admin account created.");
    }
    Ok(())
}

// 🔥 Helper to load icon for tray
fn load_tray_icon() -> Icon {
    let icon_bytes = include_bytes!("../../../../src-tauri/icons/32x32.png");
    let image = image::load_from_memory(icon_bytes)
        .expect("Failed to load tray icon")
        .into_rgba8();
    let (width, height) = image.dimensions();
    let rgba = image.into_raw();
    Icon::from_rgba(rgba, width, height).expect("Failed to create tray icon")
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Check for TUI launch argument
    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--t".to_string()) || args.contains(&"-t".to_string()) {
        let exe_path = std::env::current_exe().unwrap_or_default();
        let tui_path = exe_path.with_file_name(if cfg!(windows) {
            "openprix-tui.exe"
        } else {
            "openprix-tui"
        });
        let _ = std::process::Command::new(&tui_path).spawn();
        return Ok(());
    }

    // 2. Setup Native Event Loop (Main Thread)
    let event_loop = EventLoopBuilder::new().build();

    // 3. Build Tray Menu
    let tray_menu = Menu::new();
    let quit_i = MenuItem::new("Quit Nexus Daemon", true, None);
    let status_i = MenuItem::new("Status: Online", false, None);
    let _ = tray_menu.append_items(&[&status_i, &quit_i]);

    // 4. Initialize Tray Icon
    let _tray_icon = TrayIconBuilder::new()
        .with_menu(Box::new(tray_menu))
        .with_tooltip("OpenPrix Nexus Daemon")
        .with_icon(load_tray_icon())
        .build()
        .unwrap();

    // 4.5 Start Python backend server in the background
    std::thread::spawn(|| {
        let mut path = std::env::current_dir().unwrap_or_default();
        let mut found = false;
        for _ in 0..5 {
            let candidate = path.join("main.py");
            if candidate.exists() {
                path = candidate;
                found = true;
                break;
            }
            if let Some(parent) = path.parent() {
                path = parent.to_path_buf();
            } else {
                break;
            }
        }
        if found {
            let app_dir = path.parent().unwrap().to_str().unwrap().to_string();
            println!("Found python backend at {:?}", path);
            
            // Clean up any old process using port 8000
            if cfg!(target_os = "windows") {
                let _ = std::process::Command::new("powershell")
                    .args(&[
                        "-Command",
                        "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }",
                    ])
                    .output();
            }

            // Try spawning with "py" first
            let mut cmd = std::process::Command::new("py");
            cmd.args(&["-m", "uvicorn", "main:app", "--app-dir", &app_dir, "--port", "8000"]);
            if cmd.spawn().is_err() {
                // Fallback to "python"
                let mut cmd_fallback = std::process::Command::new("python");
                cmd_fallback.args(&["-m", "uvicorn", "main:app", "--app-dir", &app_dir, "--port", "8000"]);
                if let Err(e) = cmd_fallback.spawn() {
                    eprintln!("Failed to start python backend: {:?}", e);
                } else {
                    println!("Python backend started successfully via python");
                }
            } else {
                println!("Python backend started successfully via py");
            }
        } else {
            eprintln!("Could not locate main.py to start the Python backend.");
        }
    });

    // 5. Spawn Axum Server in Background Tokio Runtime
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            if let Err(e) = run_server().await {
                eprintln!("Server Error: {}", e);
            }
        });
    });

    // 6. Run Event Loop to handle Tray Clicks
    let menu_channel = MenuEvent::receiver();

    event_loop.run(move |_event, _window_target, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Ok(event) = menu_channel.try_recv() {
            if event.id == quit_i.id() {
                process::exit(0);
            }
        }
    });
}

// 🔥 THE LOCALHOST GATEKEEPER
async fn restrict_to_localhost(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, StatusCode> {
    let ip = addr.ip();
    // Only allow traffic originating from the local machine (127.0.0.1 or ::1)
    if ip.is_loopback() {
        Ok(next.run(request).await)
    } else {
        println!(
            "🚨 SECURITY BLOCK: Blocked remote OS-level execution attempt from {}",
            ip
        );
        Err(StatusCode::FORBIDDEN)
    }
}
// 🔥 THE JWT AUTHENTICATION GATEKEEPER
async fn require_jwt_auth(
    mut request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, StatusCode> {
    // 1. Try to extract token from Header (for API/Uploads)
    // 2. If missing, try to extract from Query String (for Downloads)
    let token = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|t| t.to_string())
        .or_else(|| {
            // Try query string '?token=...'
            request.uri().query().and_then(|q| {
                q.split('&')
                    .find(|p| p.starts_with("token="))
                    .map(|p| p.replace("token=", ""))
            })
        });

    let token = match token {
        Some(t) => t,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // 3. Verify
    match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    ) {
        Ok(token_data) => {
            request.extensions_mut().insert(token_data.claims);
            Ok(next.run(request).await)
        }
        Err(e) => {
            println!("🚨 SECURITY: Token invalid/expired: {:?}", e);
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    let root_dir = get_openprix_dir();
    let config_path = root_dir.join(".daemon_config.json");
    let status_path = root_dir.join(".daemon_status.json");


    let configured_port: u16 = fs::read_to_string(&config_path)
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v.get("port").and_then(|p| p.as_u64()))
        .map(|p| p as u16)
        .unwrap_or(0);

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], configured_port))).await?;
    let actual_port = listener.local_addr()?.port();

    let config = serde_json::json!({ "port": actual_port });
    let _ = fs::write(&config_path, config.to_string());

    // Postgres connection handling
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/openprix".to_string());
    
    let connect_options = PgConnectOptions::from_str(&db_url)?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;

    init_db(&pool).await?;

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE]);

    // 🔥 ISOLATED OS ROUTES (Protected by Middleware)
    let os_routes = Router::new()
        .route("/dirs", post(routes::os::list_directories))
        .route("/scan", post(routes::os::scan_directory))
        .route("/scaffold", post(routes::os::scaffold_project))
        .route("/upload", post(routes::os::upload_file))
        .route("/open", post(routes::os::open_file))
        .route("/db/backup", post(routes::db::backup_database)) // Moved DB ops to OS group
        .route("/db/restore", post(routes::db::restore_database)) // Moved DB ops to OS group
        .route("/db/purge", post(routes::db::purge_database)) // Moved DB ops to OS group
        .layer(axum::middleware::from_fn(restrict_to_localhost));

    // --- 1. PUBLIC ROUTES (Accessible without login) ---
    let public_routes = Router::new()
        .route("/api/health", get(|| async { "OpenPrix API is Online!" }))
        .route("/api/auth/login", post(routes::auth::login));

    // --- 2. PROTECTED ROUTES (Locked by JWT) ---
    let protected_routes = Router::new()
        .route(
            "/api/settings/{key}",
            get(routes::settings::get_settings).post(routes::settings::save_settings),
        )
        // SECURE DOWNLOAD ROUTE: Available to any remote client with a valid token
        .route("/api/os/download", get(routes::os::download_file))
        // Projects
        .route(
            "/api/projects",
            get(routes::projects::get_projects).post(routes::projects::add_project),
        )
        .route(
            "/api/projects/purge",
            post(routes::projects::purge_projects),
        )
        .route(
            "/api/projects/{id}",
            get(routes::projects::get_project)
                .put(routes::projects::update_project)
                .delete(routes::projects::delete_project),
        )
        .route(
            "/api/projects/{id}/documents",
            get(routes::projects::get_project_docs),
        )
        .route(
            "/api/projects/{id}/upload",
            post(routes::projects::upload_project_document),
        )
        .route("/api/documents", post(routes::projects::save_project_doc))
        .route(
            "/api/documents/{id}",
            delete(routes::projects::delete_project_doc),
        )
        // BOQs
        .route(
            "/api/projects/{id}/boqs",
            get(routes::boqs::get_project_boqs),
        )
        .route("/api/boqs", post(routes::boqs::add_project_boq))
        .route(
            "/api/boqs/{id}",
            put(routes::boqs::update_project_boq).delete(routes::boqs::delete_project_boq),
        )
        .route("/api/boqs/bulk", put(routes::boqs::bulk_put_project_boqs))
        .route(
            "/api/master-boqs",
            get(routes::boqs::get_master_boqs).post(routes::boqs::save_master_boq),
        )
        .route(
            "/api/master-boqs/{id}",
            delete(routes::boqs::delete_master_boq),
        )
        // CommLink
        .route(
            "/api/messages",
            get(routes::messages::get_messages).post(routes::messages::save_message),
        )
        .route(
            "/api/messages/upload",
            post(routes::messages::upload_chat_file),
        )
        .route(
            "/api/messages/{id}",
            delete(routes::messages::delete_message),
        )
        .route(
            "/api/private-messages/{u1}/{u2}",
            get(routes::messages::get_private_messages),
        )
        .route(
            "/api/private-messages",
            post(routes::messages::save_private_message),
        )
        .route(
            "/api/private-messages/{id}",
            delete(routes::messages::delete_private_message),
        )
        .route(
            "/api/notifications/check",
            get(routes::messages::check_notifications),
        )
        // Staff & Worklogs
        .route(
            "/api/staff",
            get(routes::staff::get_staff).post(routes::staff::save_staff),
        )
        .route("/api/staff/{id}", delete(routes::staff::delete_staff))
        .route(
            "/api/worklogs",
            get(routes::staff::get_worklogs).post(routes::staff::save_worklog),
        )
        .route(
            "/api/worklogs/{id}",
            put(routes::staff::update_worklog).delete(routes::staff::delete_worklog),
        )
        .route(
            "/api/projects/{id}/man-hours",
            get(routes::staff::get_project_man_hours),
        )
        // Resources & CRM
        .route(
            "/api/resources/bulk",
            post(routes::resources::bulk_save_resources),
        )
        .route(
            "/api/resources",
            get(routes::resources::get_resources).post(routes::resources::save_resource),
        )
        .route(
            "/api/resources/{id}",
            put(routes::resources::update_resource).delete(routes::resources::delete_resource),
        )
        .route(
            "/api/regions",
            get(routes::resources::get_regions).post(routes::resources::save_region),
        )
        .route(
            "/api/regions/{id}",
            delete(routes::resources::delete_region),
        )
        .route(
            "/api/crm",
            get(routes::crm::get_crm).post(routes::crm::save_crm),
        )
        .route("/api/crm/{id}", delete(routes::crm::delete_crm))
        .route("/api/kanban", get(routes::messages::get_kanban_tasks))
        // 🔥 Defense in Depth: JWT also protects the nested OS routes
        .nest("/api/os", os_routes)
        // Apply JWT protection to EVERYTHING in this specific Router
        .layer(axum::middleware::from_fn(require_jwt_auth));

    // --- 3. FINAL ASSEMBLY ---
    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(DefaultBodyLimit::disable())
        .layer(cors)
        .with_state(pool)
        .fallback(static_handler);

    let status = DaemonStatus {
        status: "online".to_string(),
        port: actual_port,
        url: Some(format!("http://127.0.0.1:{}", actual_port)),
        pid: process::id(),
    };
    fs::write(status_path, serde_json::to_string(&status)?)?;

    println!("Nexus Daemon Server Online on Port {}", actual_port);

    // 🔥 ENABLE CONNECT INFO SO THE GATEKEEPER CAN READ IPs
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;
    Ok(())
}
