mod commands;
mod models;
mod platform;
mod services;

use commands::AppState;
use std::path::PathBuf;

/// Portable mode: a file named `portable` next to the executable keeps the
/// app's data (settings, pinned ports) in a `data` folder beside it instead of
/// the user profile, so the folder can live on a USB stick or be deleted whole.
pub fn portable_data_dir() -> Option<PathBuf> {
    let dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    dir.join("portable").is_file().then(|| dir.join("data"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .setup(|app| {
            // The window is built here rather than from the config file, so
            // portable mode can point its webview profile at the data folder.
            let config = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == "main")
                .cloned()
                .expect("main window in tauri.conf.json");
            let mut builder = tauri::WebviewWindowBuilder::from_config(app.handle(), &config)?;
            if let Some(dir) = portable_data_dir() {
                std::fs::create_dir_all(&dir)?;
                builder = builder.data_directory(dir);
            }
            let window = builder.build()?;

            // The window starts hidden (see tauri.conf.json) and the frontend
            // shows it once React has painted, so launch never flashes an empty
            // frame. If the frontend never gets that far, show it anyway.
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                if !window.is_visible().unwrap_or(true) {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_active_ports,
            commands::get_common_ports,
            commands::get_port_details,
            commands::kill_process,
            commands::kill_process_by_port,
            commands::get_system_info,
            commands::is_elevated,
            commands::request_elevation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
