use crate::models::{Port, SystemInfo};
use crate::services::{PortMonitor, ProcessManager, admin};
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub port_monitor: Mutex<PortMonitor>,
    pub process_manager: Mutex<ProcessManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            port_monitor: Mutex::new(PortMonitor::new()),
            process_manager: Mutex::new(ProcessManager::new()),
        }
    }
}

#[tauri::command]
pub async fn get_active_ports(state: State<'_, AppState>) -> Result<Vec<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    monitor.get_active_ports().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_common_ports(state: State<'_, AppState>, ports: Option<Vec<u16>>) -> Result<Vec<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    if let Some(custom_ports) = ports {
        monitor.scan_ports(&custom_ports).map_err(|e| e.to_string())
    } else {
        monitor.scan_common_ports().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn get_port_details(
    port: u16,
    state: State<'_, AppState>,
) -> Result<Option<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    monitor.get_port_details(port).map_err(|e| e.to_string())
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

    let sys = System::new_all();

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: System::long_os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: sys.cpus().len(),
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
