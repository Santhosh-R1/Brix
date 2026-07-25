// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use rfd::FileDialog;
use std::fs;
use std::path::Path;

// 🔥 MISSING IMPORTS FOR THE SYSTEM TRAY & WINDOW EVENTS
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

// 🔥 1. Native File Picker
#[tauri::command]
async fn os_pick_file() -> Result<Option<String>, String> {
    let file = FileDialog::new().set_title("Select a File").pick_file();
    Ok(file.map(|path| path.to_string_lossy().into_owned()))
}

// 🔥 2. Native Directory Picker
#[tauri::command]
async fn os_pick_directory() -> Result<Option<String>, String> {
    let dir = FileDialog::new()
        .set_title("Select a Directory")
        .pick_folder();
    Ok(dir.map(|path| path.to_string_lossy().into_owned()))
}

// 🔥 3. Open File with Default OS Application
#[tauri::command]
async fn os_open_file(file_path: String) -> Result<bool, String> {
    match open::that(&file_path) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to open file: {}", e)),
    }
}

// 🔥 4. Read File and Convert to Base64 (For the web frontend)
#[tauri::command]
async fn os_get_base64(file_path: String) -> Result<Option<String>, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("File does not exist".into());
    }

    let buffer = fs::read(path).map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&buffer);

    // Determine the MIME type dynamically based on the extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime_type = match ext.as_str() {
        "svg" => "image/svg+xml",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    };

    Ok(Some(format!("data:{};base64,{}", mime_type, b64)))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 1. Load Plugins
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        // 2. Register React Commands
        .invoke_handler(tauri::generate_handler![
            os_pick_file,
            os_pick_directory,
            os_open_file,
            os_get_base64
        ])
        // 3. Setup the System Tray
        .setup(|app| {
            // Create menu items
            let show_i = MenuItem::with_id(app, "show", "Open Workspace", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Server", true, None::<&str>)?;

            // Bundle them into a Menu
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Build the Tray Icon
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            // The ONLY way to actually kill the Axum server
                            std::process::exit(0);
                        }
                        "show" => {
                            // Unhide the main window
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Double-click the tray icon to quickly open the app
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // 4. Hijack the Close Event
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the OS from actually killing the process
                api.prevent_close();
                // Hide the window instead
                window.hide().unwrap();
            }
        })
        // 5. FINALLY, Run the App (Call this exactly once at the very end!)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
