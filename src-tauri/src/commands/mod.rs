use porter_core::advisor::{advise, Advice};
use porter_core::models::{Port, SystemInfo};
use porter_core::services::{admin, PortMonitor, ProcessManager, ScanOptions};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub process_manager: Mutex<ProcessManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            process_manager: Mutex::new(ProcessManager::new()),
        }
    }
}

/// Run a scan on the blocking pool. Scans call into the OS and used to run
/// inline on an async worker thread while holding a lock.
async fn blocking<T: Send + 'static>(
    f: impl FnOnce() -> anyhow::Result<T> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

/// A port with Porter's advice on it: why it's open, how far it reaches and
/// whether it should be.
#[derive(Serialize)]
pub struct PortView {
    #[serde(flatten)]
    port: Port,
    advice: Advice,
}

/// Listening ports, TCP and UDP, each with its container and advice. With
/// `include_connections`, also the local end of every connection (the "Show
/// outgoing connections" setting, off by default). UDP always comes back: the
/// Exposed view and the banner need it, and the list hides it unless the
/// "Show UDP ports" setting is on.
#[tauri::command]
pub async fn get_active_ports(include_connections: Option<bool>) -> Result<Vec<PortView>, String> {
    let opts = ScanOptions {
        connections: include_connections.unwrap_or(false),
        udp: true,
        containers: true,
    };
    blocking(move || {
        let ports = PortMonitor::new().get_ports(opts)?;
        Ok(ports.into_iter().map(|port| PortView { advice: advise(&port), port }).collect())
    })
    .await
}

#[tauri::command]
pub async fn get_common_ports(ports: Option<Vec<u16>>) -> Result<Vec<Port>, String> {
    blocking(move || match ports {
        Some(custom) => PortMonitor::new().scan_ports(&custom),
        None => PortMonitor::new().scan_common_ports(),
    })
    .await
}

#[tauri::command]
pub async fn get_port_details(port: u16) -> Result<Option<Port>, String> {
    blocking(move || PortMonitor::new().get_port_details(port)).await
}

#[tauri::command]
pub async fn kill_process(pid: u32, state: State<'_, AppState>) -> Result<bool, String> {
    let mut manager = state.process_manager.lock().unwrap();
    manager.kill_process(pid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kill_process_by_port(port: u16, state: State<'_, AppState>) -> Result<bool, String> {
    let mut manager = state.process_manager.lock().unwrap();
    manager
        .kill_process_by_port(port)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    use sysinfo::System;

    // Only memory is needed; new_all() also loaded every process and disk.
    let mut sys = System::new();
    sys.refresh_memory();

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: System::long_os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
        total_memory: sys.total_memory(),
    })
}

#[tauri::command]
pub async fn is_elevated() -> Result<bool, String> {
    Ok(admin::is_elevated())
}

/// Whether `porter`, the bundled terminal version, runs in a new terminal,
/// and whether this app can change that (the "Command line tool" setting).
#[tauri::command]
pub async fn get_cli_status() -> Result<porter_core::services::cli_path::CliStatus, String> {
    blocking(|| Ok(porter_core::services::cli_path::status())).await
}

/// Put the bundled `porter` on the PATH or take it off. On macOS this shows
/// the password prompt.
#[tauri::command]
pub async fn set_cli_on_path(on: bool) -> Result<porter_core::services::cli_path::CliStatus, String> {
    blocking(move || porter_core::services::cli_path::set_on_path(on)).await
}

/// True when installed from the Microsoft Store, which delivers the updates.
#[tauri::command]
pub fn is_store_package() -> bool {
    admin::package_family_name().is_some()
}

#[tauri::command]
pub async fn request_elevation() -> Result<(), String> {
    admin::request_elevation().map_err(|e| e.to_string())
}
