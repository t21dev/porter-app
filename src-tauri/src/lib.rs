mod commands;
mod models;
mod platform;
mod services;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_active_ports,
            commands::get_common_ports,
            commands::get_port_details,
            commands::kill_process,
            commands::kill_process_by_port,
            commands::get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
