use crate::models::{Port, PortStatus, Process, Protocol};
use crate::platform;
use anyhow::Result;
use sysinfo::{ProcessExt, System, SystemExt, PidExt};
use std::collections::HashMap;

pub struct PortMonitor {
    system: System,
}

impl PortMonitor {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    /// Get all active ports (listening or established)
    pub fn get_active_ports(&mut self) -> Result<Vec<Port>> {
        self.system.refresh_all();

        // Use platform-specific implementation
        let port_info = platform::get_network_connections()?;

        let mut ports: HashMap<u16, Port> = HashMap::new();

        for conn in port_info {
            if ports.contains_key(&conn.local_port) {
                continue;
            }

            let process = if conn.pid > 0 {
                self.get_process_info(conn.pid)
            } else {
                None
            };

            let status = if process.is_some() {
                if platform::is_system_process(conn.pid) {
                    PortStatus::System
                } else {
                    PortStatus::Occupied
                }
            } else {
                PortStatus::Free
            };

            ports.insert(conn.local_port, Port {
                port: conn.local_port,
                status,
                protocol: conn.protocol,
                process,
                ip_address: conn.local_address,
                created_at: Some(chrono::Utc::now()),
            });
        }

        Ok(ports.into_values().collect())
    }

    /// Get detailed information about a specific port
    pub fn get_port_details(&mut self, port: u16) -> Result<Option<Port>> {
        let ports = self.get_active_ports()?;
        Ok(ports.into_iter().find(|p| p.port == port))
    }

    /// Scan common developer ports
    pub fn scan_common_ports(&mut self) -> Result<Vec<Port>> {
        let common_ports = vec![3000, 3001, 4200, 5000, 5173, 8000, 8080, 9000];
        let all_ports = self.get_active_ports()?;

        let mut result = Vec::new();
        for port_num in common_ports {
            if let Some(port) = all_ports.iter().find(|p| p.port == port_num) {
                result.push(port.clone());
            } else {
                // Port is free
                result.push(Port {
                    port: port_num,
                    status: PortStatus::Free,
                    protocol: Protocol::TCP,
                    process: None,
                    ip_address: "127.0.0.1".to_string(),
                    created_at: Some(chrono::Utc::now()),
                });
            }
        }

        Ok(result)
    }

    /// Get process information by PID
    fn get_process_info(&self, pid: u32) -> Option<Process> {
        let process = self.system.process(sysinfo::Pid::from(pid as usize))?;

        Some(Process {
            pid,
            name: process.name().to_string(),
            path: process.exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
            command: process.cmd().join(" "),
            working_dir: process.cwd().map(|p| p.to_string_lossy().to_string()),
            cpu_usage: process.cpu_usage(),
            memory_usage: process.memory(),
            started_at: chrono::DateTime::from_timestamp(
                process.start_time() as i64,
                0
            ).unwrap_or_else(|| chrono::Utc::now()),
            user: process.user_id().map(|uid| uid.to_string()),
        })
    }
}
