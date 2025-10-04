use super::{NetworkConnection, Protocol};
use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    // Read TCP connections from /proc/net/tcp
    if let Ok(tcp_conns) = parse_proc_net_tcp("/proc/net/tcp") {
        connections.extend(tcp_conns);
    }

    // Read TCP6 connections
    if let Ok(tcp6_conns) = parse_proc_net_tcp("/proc/net/tcp6") {
        connections.extend(tcp6_conns);
    }

    Ok(connections)
}

fn parse_proc_net_tcp(path: &str) -> Result<Vec<NetworkConnection>> {
    let content = fs::read_to_string(path)?;
    let mut connections = Vec::new();

    for line in content.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() < 10 {
            continue;
        }

        // Parse local address and port
        let local_parts: Vec<&str> = parts[1].split(':').collect();
        if local_parts.len() != 2 {
            continue;
        }

        let local_port = u16::from_str_radix(local_parts[1], 16).unwrap_or(0);
        let local_addr = parse_hex_address(local_parts[0]);

        // Parse PID from inode
        let inode = parts[9].parse::<u64>().unwrap_or(0);
        let pid = find_pid_by_inode(inode).unwrap_or(0);

        connections.push(NetworkConnection {
            local_address: local_addr,
            local_port,
            remote_address: String::new(),
            remote_port: 0,
            protocol: Protocol::TCP,
            pid,
            state: "ESTABLISHED".to_string(),
        });
    }

    Ok(connections)
}

fn parse_hex_address(hex: &str) -> String {
    let addr = u32::from_str_radix(hex, 16).unwrap_or(0);
    format!(
        "{}.{}.{}.{}",
        addr & 0xFF,
        (addr >> 8) & 0xFF,
        (addr >> 16) & 0xFF,
        (addr >> 24) & 0xFF
    )
}

fn find_pid_by_inode(inode: u64) -> Option<u32> {
    let proc_path = Path::new("/proc");

    if let Ok(entries) = fs::read_dir(proc_path) {
        for entry in entries.flatten() {
            if let Ok(pid) = entry.file_name().to_string_lossy().parse::<u32>() {
                let fd_path = entry.path().join("fd");

                if let Ok(fd_entries) = fs::read_dir(fd_path) {
                    for fd_entry in fd_entries.flatten() {
                        if let Ok(link) = fs::read_link(fd_entry.path()) {
                            let link_str = link.to_string_lossy();
                            if link_str.contains(&format!("socket:[{}]", inode)) {
                                return Some(pid);
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

pub fn is_system_process(pid: u32) -> bool {
    // Linux system processes typically have PID < 1000
    pid < 1000
}
