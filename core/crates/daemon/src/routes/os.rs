use axum::extract::Multipart;
use axum::{
    Json,
    extract::Query,
    http::{StatusCode, header},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

// Assuming you have a standard ApiResponse struct in your routes module
use crate::routes::ApiResponse;

#[derive(Deserialize)]
pub struct DownloadQuery {
    pub path: String,
    #[allow(dead_code)]
    pub token: String,
}

#[derive(Deserialize)]
pub struct OpenPayload {
    pub path: String,
}

#[derive(Deserialize)]
pub struct ScaffoldPayload {
    #[serde(rename = "rootPath")]
    pub root_path: String,
    #[serde(rename = "projectFolderName")]
    pub project_folder_name: String,
    #[serde(rename = "templateFolders")]
    pub template_folders: Vec<String>,
}

// ----------------------------------------------------------------------------
// 1. SCAFFOLD PROJECT DIRECTORY
// ----------------------------------------------------------------------------
pub async fn scaffold_project(Json(payload): Json<ScaffoldPayload>) -> Json<ApiResponse<String>> {
    let base_dir = Path::new(&payload.root_path).join(&payload.project_folder_name);

    // Create the master project folder
    if let Err(e) = fs::create_dir_all(&base_dir) {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to create root folder: {}", e)),
        });
    }

    // Loop through the template array and generate the subdirectories
    for folder in payload.template_folders {
        let sub_path = base_dir.join(folder);
        let _ = fs::create_dir_all(&sub_path); // Ignore minor errors if folder already exists
    }

    // Return the absolute path so React can save it to the project database
    Json(ApiResponse {
        success: true,
        data: Some(base_dir.to_string_lossy().to_string()),
        error: None,
    })
}

// ----------------------------------------------------------------------------
// 2. UPLOAD FILE TO HOST
// ----------------------------------------------------------------------------
pub async fn upload_file(mut multipart: Multipart) -> Json<ApiResponse<String>> {
    let mut file_path = None;

    // Default fallback directory
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let mut upload_dir = Path::new(&home).join(".openprix").join("uploads");

    // Loop through the stream chunks
    while let Some(mut field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();

        if name == "targetFolder" {
            let data = field.text().await.unwrap_or_default();
            if !data.is_empty() && data != "null" {
                upload_dir = Path::new(&data).to_path_buf();
            }
            if let Err(e) = std::fs::create_dir_all(&upload_dir) {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(format!("Dir error: {}", e)),
                });
            }
        } else if name == "file" {
            // Variable declared exactly where it is used
            let filename = field.file_name().unwrap_or("unnamed.file").to_string();

            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let safe_name = format!(
                "{}_{}",
                ts,
                filename.replace(
                    |c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_',
                    ""
                )
            );
            let dest_path = upload_dir.join(&safe_name);

            // 🔥 STREAM DIRECTLY TO DISK IN CHUNKS
            if let Ok(mut f) = File::create(&dest_path).await {
                while let Ok(Some(chunk)) = field.chunk().await {
                    let _ = f.write_all(&chunk).await;
                }
            }

            // Normalize path for React
            file_path = Some(dest_path.to_string_lossy().replace("\\", "/"));
        }
    }

    if let Some(path) = file_path {
        Json(ApiResponse {
            success: true,
            data: Some(path),
            error: None,
        })
    } else {
        Json(ApiResponse {
            success: false,
            data: None,
            error: Some("No file found in stream".into()),
        })
    }
}

// ----------------------------------------------------------------------------
// 3. DOWNLOAD / PREVIEW FILE (For Site Gallery & Docs)
// ----------------------------------------------------------------------------
pub async fn download_file(Query(query): Query<DownloadQuery>) -> impl IntoResponse {
    let raw_path = query.path.trim();
    let path = Path::new(raw_path);

    if !path.exists() || !path.is_file() {
        return (StatusCode::NOT_FOUND, "File not found.").into_response();
    }

    // 1. Get the actual filename from the path (e.g., "5f3a2b1c_myphoto.jpg")
    let raw_filename = path.file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("download");

    // 2. Logic to strip the alphanumeric/timestamp prefix (e.g., "5f3a2b1c_" or "1778926637805_")
    let clean_filename = if let Some((prefix, original)) = raw_filename.split_once('_') {
        // Check if prefix looks like our generated code:
        // Either 8-char hex (UUID) OR a long numeric timestamp
        let is_uuid_prefix = prefix.len() == 8 && prefix.chars().all(|c| c.is_ascii_hexdigit());
        let is_timestamp_prefix = prefix.chars().all(|c| c.is_ascii_digit());
        
        if is_uuid_prefix || is_timestamp_prefix {
            original // Return just the clean original filename
        } else {
            raw_filename // Not our generated format, keep original
        }
    } else {
        raw_filename
    };

    // 3. Format the disposition header with the clean name
    let disposition = format!("attachment; filename=\"{}\"", clean_filename);

    match fs::read(path) {
        Ok(bytes) => {
            let mime = mime_guess::from_path(path)
                .first_or_octet_stream()
                .as_ref()
                .to_string();

            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, mime),
                    (header::CONTENT_DISPOSITION, disposition),
                ],
                bytes,
            )
                .into_response()
        }
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Read error: {}", e)).into_response()
        }
    }
}
// ----------------------------------------------------------------------------
// 4. OPEN NATIVE APPLICATION (AutoCAD, Excel, PDF Viewer)
// ----------------------------------------------------------------------------
pub async fn open_file(Json(payload): Json<OpenPayload>) -> Json<ApiResponse<String>> {
    let path = Path::new(&payload.path);

    // 🔥 THE DETONATOR SHIELD
    let dangerous_exts = ["exe", "bat", "cmd", "sh", "vbs", "ps1", "msi", "js", "html"];
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if dangerous_exts.contains(&ext.as_str()) {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some(
                "SECURITY SHIELD: Executable and script files cannot be opened natively.".into(),
            ),
        });
    }

    if path.exists() {
        match open::that(path) {
            Ok(_) => Json(ApiResponse {
                success: true,
                data: Some("Opened natively".into()),
                error: None,
            }),
            Err(e) => Json(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("Failed to open native app: {}", e)),
            }),
        }
    } else {
        Json(ApiResponse {
            success: false,
            data: None,
            error: Some("File missing or moved from host directory.".into()),
        })
    }
}

// ----------------------------------------------------------------------------
// 5. DIRECTORY SCANNER (RECURSIVE & SLASH NORMALIZED)
// ----------------------------------------------------------------------------
#[derive(Deserialize)]
pub struct ScanPayload {
    #[serde(rename = "targetFolder")]
    pub target_folder: String,
    #[serde(rename = "ignoredExtensions")]
    pub ignored_extensions: Vec<String>,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub size: u64,
    pub modified: u128,
}

// 🔥 Helper function to recursively walk through all sub-directories!
fn walk_dir_recursive(dir: &Path, ignored_exts: &Vec<String>, files: &mut Vec<FileInfo>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                let path = entry.path();

                if metadata.is_dir() {
                    // It's a folder! Dive deeper into it.
                    walk_dir_recursive(&path, ignored_exts, files);
                } else if metadata.is_file() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let ext = path
                        .extension()
                        .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
                        .unwrap_or_default();

                    if ignored_exts.contains(&ext) {
                        continue; // Skip the junk files (.bak, .log, etc)
                    }

                    let modified = metadata
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_millis())
                        .unwrap_or(0);

                    // 🔥 Normalize Windows backslashes to standard forward slashes so React matches them perfectly!
                    let normalized_path = path.to_string_lossy().replace("\\", "/");

                    files.push(FileInfo {
                        name,
                        path: normalized_path,
                        extension: ext,
                        size: metadata.len(),
                        modified,
                    });
                }
            }
        }
    }
}

pub async fn scan_directory(Json(payload): Json<ScanPayload>) -> Json<ApiResponse<Vec<FileInfo>>> {
    let dir_path = Path::new(&payload.target_folder);

    if !dir_path.exists() || !dir_path.is_dir() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Directory does not exist.".into()),
        });
    }

    let mut files = Vec::new();

    // Kick off the recursive search
    walk_dir_recursive(dir_path, &payload.ignored_extensions, &mut files);

    Json(ApiResponse {
        success: true,
        data: Some(files),
        error: None,
    })
}

// ----------------------------------------------------------------------------
// 6. DIRECTORY STRUCTURE MAPPER (For UI Dropdowns)
// ----------------------------------------------------------------------------
#[derive(Deserialize)]
pub struct DirPayload {
    #[serde(rename = "targetFolder")]
    pub target_folder: String,
}

// Helper to recursively collect just the directory paths
fn walk_dirs_recursive(dir: &Path, base_path: &Path, dirs: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    let path = entry.path();

                    // Extract the relative path (e.g., "01_Drawings/Architectural")
                    if let Ok(rel_path) = path.strip_prefix(base_path) {
                        let normalized = rel_path.to_string_lossy().replace("\\", "/");
                        if !normalized.is_empty() {
                            dirs.push(normalized);
                        }
                    }

                    // Dive deeper into sub-folders
                    walk_dirs_recursive(&path, base_path, dirs);
                }
            }
        }
    }
}

pub async fn list_directories(Json(payload): Json<DirPayload>) -> Json<ApiResponse<Vec<String>>> {
    let dir_path = Path::new(&payload.target_folder);

    if !dir_path.exists() || !dir_path.is_dir() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Directory not found".into()),
        });
    }

    let mut dirs = Vec::new();

    // Kick off the folder search
    walk_dirs_recursive(dir_path, dir_path, &mut dirs);

    // Sort alphabetically so the dropdown looks clean
    dirs.sort();

    Json(ApiResponse {
        success: true,
        data: Some(dirs),
        error: None,
    })
}
