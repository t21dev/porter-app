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

/// What `PortMonitor::get_ports` includes beyond listening TCP ports.
#[derive(Debug, Clone, Copy, Default)]
pub struct ScanOptions {
    /// The local end of every connection, not only listeners.
    pub connections: bool,
    /// UDP sockets that take packets from anyone (bound, not connected).
    pub udp: bool,
    /// Ask Docker and Podman which container publishes each port.
    pub containers: bool,
}

impl PortMonitor {
    pub fn new() -> Self {
        Self
    }

    /// Every listening TCP port, with the name and PID of its owner. With
    /// `include_connections`, also the local port of every connection.
    pub fn get_active_ports(&mut self, include_connections: bool) -> Result<Vec<Port>> {
        self.scan_sockets(include_connections, false)
    }

    /// What the CLI shows: TCP, plus UDP and the container behind every port
    /// Docker or Podman publishes when asked. A published port with no socket
    /// of its own (Docker's userland proxy turned off) is added, owned by its
    /// container alone.
    pub fn get_ports(&mut self, opts: ScanOptions) -> Result<Vec<Port>> {
        let ports = self.scan_sockets(opts.connections, opts.udp)?;
        Ok(if opts.containers {
            merge_containers(ports, crate::containers::published_ports())
        } else {
            ports
        })
    }

    /// One entry per port and protocol, so TCP 53 and UDP 53 are two rows.
    fn scan_sockets(&mut self, include_connections: bool, include_udp: bool) -> Result<Vec<Port>> {
        let mut conns = platform::get_network_connections(include_connections)?;
        if include_udp {
            // UDP is extra: a failure there shouldn't hide the TCP ports.
            conns.extend(platform::get_udp_sockets(include_connections).unwrap_or_default());
        }
        // A port can have a listener and connections; the listener names it.
        // Among several listeners on one port (0.0.0.0 and 127.0.0.1, or two
        // programs on different addresses), the widest-reaching one is shown,
        // so an exposed socket is never hidden behind a local one.
        conns.sort_by_key(|c| (c.state != "LISTEN", reach_rank(&c.local_address)));
        let pids: Vec<Pid> = {
            let mut v: Vec<u32> = conns.iter().map(|c| c.pid).filter(|p| *p > 0).collect();
            v.sort_unstable();
            v.dedup();
            v.into_iter().map(Pid::from_u32).collect()
        };
        // Names come from the snapshot itself, so nothing extra is read.
        let mut system = System::new();
        system.refresh_processes_specifics(ProcessesToUpdate::Some(&pids), ProcessRefreshKind::new());

        let mut ports: HashMap<(u16, Protocol), Port> = HashMap::new();
        for conn in conns {
            let key = (conn.local_port, conn.protocol.clone());
            if ports.contains_key(&key) {
                continue;
            }
            // A name that came with the socket wins: inside Flatpak the PID is
            // the host's, and the sandbox may have its own process by that PID.
            let process = (conn.pid > 0)
                .then(|| {
                    conn.process_name.clone().or_else(|| {
                        system
                            .process(Pid::from_u32(conn.pid))
                            .map(|p| p.name().to_string_lossy().into_owned())
                    })
                })
                .flatten()
                .map(|name| Process::named(conn.pid, name));
            ports.insert(key, Port::from_connection(conn, process));
        }
        Ok(ports.into_values().collect())
    }

    /// One port with everything known about its process: path, command line,
    /// working directory, start time and memory. Only this one process is read.
    pub fn get_port_details(&mut self, port: u16) -> Result<Option<Port>> {
        let mut conns = platform::get_network_connections(true)?;
        conns.sort_by_key(|c| c.state != "LISTEN");
        let Some(conn) = conns.into_iter().find(|c| c.local_port == port)
        else {
            return Ok(None);
        };
        #[cfg(target_os = "linux")]
        if platform::flatpak::is_sandboxed() {
            let process = (conn.pid > 0)
                .then(|| platform::flatpak::process_details(conn.pid))
                .flatten();
            return Ok(Some(Port::from_connection(conn, process)));
        }
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
            .get_active_ports(false)?
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
                    container: None,
                })
            })
            .collect())
    }
}

/// 0 for every interface, 1 for one routable address, 2 for loopback.
fn reach_rank(address: &str) -> u8 {
    match crate::advisor::Exposure::of(address) {
        crate::advisor::Exposure::All => 0,
        crate::advisor::Exposure::Public | crate::advisor::Exposure::Private => 1,
        crate::advisor::Exposure::Local => 2,
    }
}

/// Attach each published port's container to the port it publishes.
pub(crate) fn merge_containers(
    mut ports: Vec<Port>,
    published: Vec<crate::containers::PublishedPort>,
) -> Vec<Port> {
    for p in published {
        match ports.iter_mut().find(|port| port.port == p.host_port && port.protocol == p.protocol) {
            Some(port) => {
                if port.container.is_none() {
                    port.container = Some(p.container);
                    // Even when the forwarding process is hidden from this user.
                    if port.status == PortStatus::Free {
                        port.status = PortStatus::Occupied;
                    }
                }
            }
            None => ports.push(Port {
                port: p.host_port,
                status: PortStatus::Occupied,
                protocol: p.protocol,
                process: None,
                ip_address: p.host_ip,
                container: Some(p.container),
            }),
        }
    }
    ports
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
            container: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::containers::{Container, PublishedPort};

    fn published(port: u16, ip: &str) -> PublishedPort {
        PublishedPort {
            host_ip: ip.into(),
            host_port: port,
            protocol: Protocol::TCP,
            container: Container {
                runtime: "docker".into(),
                id: "abc".into(),
                name: "db".into(),
                image: "postgres:16".into(),
                container_port: 5432,
            },
        }
    }

    #[test]
    fn the_widest_listener_sorts_first() {
        let mut addrs = vec!["127.0.0.11", "192.168.1.4", "::", "::1"];
        addrs.sort_by_key(|a| reach_rank(a));
        assert_eq!(addrs, vec!["::", "192.168.1.4", "127.0.0.11", "::1"]);
    }

    #[test]
    fn containers_attach_to_their_sockets_and_fill_gaps() {
        let hidden_owner = Port {
            port: 15432,
            status: PortStatus::Free,
            protocol: Protocol::TCP,
            process: None,
            ip_address: "0.0.0.0".into(),
            container: None,
        };
        let merged = merge_containers(vec![hidden_owner], vec![published(15432, "0.0.0.0"), published(25432, "127.0.0.1")]);
        assert_eq!(merged.len(), 2);
        // The socket keeps its address; the container names it and marks it used.
        assert_eq!(merged[0].container.as_ref().unwrap().name, "db");
        assert_eq!(merged[0].status, PortStatus::Occupied);
        // No socket at all (userland proxy off): the container's own entry.
        assert_eq!((merged[1].port, merged[1].ip_address.as_str()), (25432, "127.0.0.1"));
    }
}
