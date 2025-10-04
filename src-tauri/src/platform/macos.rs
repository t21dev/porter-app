use super::{NetworkConnection, Protocol};
use anyhow::Result;
use std::process::Command;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    // Use lsof command to get network connections
    let output = Command::new("lsof")
        .args(&["-i", "-P", "-n"])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() < 9 {
            continue;
        }

        let name_field = parts[8];

        // Parse address:port
        if let Some((addr, port_str)) = name_field.rsplit_once(':') {
            if let Ok(port) = port_str.parse::<u16>() {
                let pid = parts[1].parse::<u32>().unwrap_or(0);

                let protocol = if parts[7].contains("TCP") {
                    Protocol::TCP
                } else {
                    Protocol::UDP
                };

                connections.push(NetworkConnection {
                    local_address: addr.to_string(),
                    local_port: port,
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol,
                    pid,
                    state: parts.get(9).unwrap_or(&"").to_string(),
                });
            }
        }
    }

    Ok(connections)
}

pub fn is_system_process(pid: u32) -> bool {
    // macOS system processes typically have PID < 500
    pid < 500
}
