use crate::models::{Port, PortStatus, Process, Protocol};
use crate::platform;
use anyhow::Result;
use std::collections::HashMap;
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

/// Scans listening ports and names the process behind each one.
///
/// It holds no state between scans. Each scan takes one snapshot of the
/// process table limited to the PIDs that own a port, instead of refreshing
/// every process on the machine (command line, working directory, CPU and
/// memory for hundreds of processes) every few seconds just to label a few.
pub struct PortMonitor;

impl PortMonitor {
    pub fn new() -> Self {
        Self
    }

    /// Every listening port, with the name and PID of its owner.
    pub fn get_active_ports(&mut self) -> Result<Vec<Port>> {
        let conns = platform::get_network_connections()?;
        let pids: Vec<Pid> = {
            let mut v: Vec<u32> = conns.iter().map(|c| c.pid).filter(|p| *p > 0).collect();
            v.sort_unstable();
            v.dedup();
            v.into_iter().map(Pid::from_u32).collect()
        };
        // Names come from the snapshot itself, so nothing extra is read.
        let mut system = System::new();
        system.refresh_processes_specifics(ProcessesToUpdate::Some(&pids), ProcessRefreshKind::new());

        let mut ports: HashMap<u16, Port> = HashMap::new();
        for conn in conns {
            if ports.contains_key(&conn.local_port) {
                continue;
            }
            let process = (conn.pid > 0)
                .then(|| system.process(Pid::from_u32(conn.pid)))
                .flatten()
                .map(|p| Process::named(conn.pid, p.name().to_string_lossy().into_owned()));
            ports.insert(conn.local_port, Port::from_connection(conn, process));
        }
        Ok(ports.into_values().collect())
    }

    /// One port with everything known about its process: path, command line,
    /// working directory, start time and memory. Only this one process is read.
    pub fn get_port_details(&mut self, port: u16) -> Result<Option<Port>> {
        let Some(conn) = platform::get_network_connections()?
            .into_iter()
            .find(|c| c.local_port == port)
        else {
            return Ok(None);
        };
        let pid = Pid::from_u32(conn.pid);
        let mut system = System::new();
        system.refresh_processes_specifics(
            ProcessesToUpdate::Some(&[pid]),
            ProcessRefreshKind::new()
                .with_memory()
                .with_exe(UpdateKind::Always)
                .with_cmd(UpdateKind::Always)
                .with_cwd(UpdateKind::Always)
                .with_user(UpdateKind::Always),
        );
        let process = system.process(pid).map(|p| Process {
            pid: conn.pid,
            name: p.name().to_string_lossy().into_owned(),
            path: p.exe().map(|e| e.to_string_lossy().into_owned()),
            command: Some(
                p.cmd()
                    .iter()
                    .map(|s| s.to_string_lossy().into_owned())
                    .collect::<Vec<_>>()
                    .join(" "),
            ),
            working_dir: p.cwd().map(|c| c.to_string_lossy().into_owned()),
            memory_usage: Some(p.memory()),
            started_at: chrono::DateTime::from_timestamp(p.start_time() as i64, 0),
            user: p.user_id().map(|uid| format!("{:?}", uid)),
        });
        Ok(Some(Port::from_connection(conn, process)))
    }

    /// Scan common developer ports
    pub fn scan_common_ports(&mut self) -> Result<Vec<Port>> {
        let common_ports = vec![
            3000, 3001, 4200, 5000, 5173, 8000, 8080, 8888, 9000, 9090, 80, 443, 5432, 3306,
            6379, 27017, 5672, 15672, 11211, 5984,
        ];
        self.scan_ports(&common_ports)
    }

    /// Scan specific ports
    pub fn scan_ports(&mut self, ports_to_scan: &[u16]) -> Result<Vec<Port>> {
        let all_ports: HashMap<u16, Port> = self
            .get_active_ports()?
            .into_iter()
            .map(|p| (p.port, p))
            .collect();

        Ok(ports_to_scan
            .iter()
            .map(|port_num| {
                all_ports.get(port_num).cloned().unwrap_or(Port {
                    port: *port_num,
                    status: PortStatus::Free,
                    protocol: Protocol::TCP,
                    process: None,
                    ip_address: "127.0.0.1".to_string(),
                })
            })
            .collect())
    }
}

impl Port {
    fn from_connection(conn: platform::NetworkConnection, process: Option<Process>) -> Self {
        let status = match &process {
            Some(_) if platform::is_system_process(conn.pid) => PortStatus::System,
            Some(_) => PortStatus::Occupied,
            None => PortStatus::Free,
        };
        Port {
            port: conn.local_port,
            status,
            protocol: conn.protocol,
            process,
            ip_address: conn.local_address,
        }
    }
}
