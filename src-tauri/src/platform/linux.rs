use super::{parse_proc_net_tcp, socket_inode, NetworkConnection, Protocol};
use anyhow::Result;
use std::collections::HashMap;
use std::fs;

/// Listening TCP sockets, IPv4 and IPv6, with the PID that owns each.
///
/// The owner is found by matching socket inodes against /proc/<pid>/fd links.
/// That walk happens once per scan for all sockets together. It used to run
/// once per connection, reading every descriptor of every process each time:
/// millions of readlink calls every few seconds on a busy machine.
pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut listeners = Vec::new();
    for path in ["/proc/net/tcp", "/proc/net/tcp6"] {
        if let Ok(content) = fs::read_to_string(path) {
            listeners.extend(parse_proc_net_tcp(&content));
        }
    }
    let mut owners: HashMap<u64, u32> = listeners.iter().map(|l| (l.inode, 0)).collect();
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
            state: "LISTEN".to_string(),
        })
        .collect())
}

pub fn is_system_process(pid: u32) -> bool {
    // Linux system processes typically have PID < 1000
    pid < 1000
}
