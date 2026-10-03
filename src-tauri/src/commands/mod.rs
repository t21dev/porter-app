use crate::models::{Port, SystemInfo};
use crate::services::{PortMonitor, ProcessManager, admin};
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

#[tauri::command]
pub async fn get_active_ports() -> Result<Vec<Port>, String> {
    blocking(|| PortMonitor::new().get_active_ports()).await
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

#[tauri::command]
pub async fn request_elevation() -> Result<(), String> {
    admin::request_elevation().map_err(|e| e.to_string())
}
