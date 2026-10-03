use super::{parse_proc_net_tcp, socket_inode, NetworkConnection, Protocol};
use anyhow::Result;
use std::collections::HashMap;
use std::fs;

/// TCP sockets, IPv4 and IPv6, with the PID that owns each: listeners only, or
/// every connection too with `include_connections`.
///
/// The owner is found by matching socket inodes against /proc/<pid>/fd links.
/// That walk happens once per scan for all sockets together. It used to run
/// once per connection, reading every descriptor of every process each time:
/// millions of readlink calls every few seconds on a busy machine.
pub fn get_network_connections(include_connections: bool) -> Result<Vec<NetworkConnection>> {
    // The socket tables of the network namespace to watch. /proc/net is this
    // process's own. The Docker image points it at /proc/1/net, which with
    // the host's process namespace (pid: host) is the host's network, while
    // the container keeps its own network for the browser view.
    let net = std::env::var("PORTER_NET_DIR").unwrap_or_else(|_| "/proc/net".to_string());
    let mut listeners = Vec::new();
    for file in ["tcp", "tcp6"] {
        if let Ok(content) = fs::read_to_string(format!("{net}/{file}")) {
            listeners.extend(parse_proc_net_tcp(&content, include_connections));
        }
    }
    // Inode 0 is a socket with no owner left (TIME_WAIT); nothing to look up.
    let mut owners: HashMap<u64, u32> = listeners
        .iter()
        .filter(|l| l.inode != 0)
        .map(|l| (l.inode, 0))
        .collect();
    let mut left = owners.len();

    if left > 0 {
        if let Ok(procs) = fs::read_dir("/proc") {
            'procs: for entry in procs.flatten() {
                let Ok(pid) = entry.file_name().to_string_lossy().parse::<u32>() else {
                    continue;
                };
                let Ok(fds) = fs::read_dir(entry.path().join("fd")) else {
                    continue;
                };
                for fd in fds.flatten() {
                    let Ok(link) = fs::read_link(fd.path()) else { continue };
                    let Some(inode) = socket_inode(&link.to_string_lossy()) else { continue };
                    if let Some(owner) = owners.get_mut(&inode) {
                        if *owner == 0 {
                            *owner = pid;
                            left -= 1;
                            if left == 0 {
                                break 'procs;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(listeners
        .into_iter()
        .map(|l| NetworkConnection {
            pid: owners.get(&l.inode).copied().unwrap_or(0),
            local_address: l.address,
            local_port: l.port,
            remote_address: String::new(),
            remote_port: 0,
            protocol: Protocol::TCP,
            state: if l.listening { "LISTEN" } else { "CONNECTED" }.to_string(),
        })
        .collect())
}

pub fn is_system_process(pid: u32) -> bool {
    // Linux system processes typically have PID < 1000
    pid < 1000
}
