use super::{NetworkConnection, Protocol};
use anyhow::Result;
use std::process::Command;

/// Sockets from lsof: TCP listeners only, or every connection with
/// `include_connections`. Asking lsof for listeners alone is much less work
/// for it than listing every connection and throwing most away.
pub fn get_network_connections(include_connections: bool) -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    let args: &[&str] = if include_connections {
        &["-i", "-P", "-n"]
    } else {
        &["-iTCP", "-sTCP:LISTEN", "-P", "-n"]
    };
    let output = Command::new("lsof").args(args).output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() < 9 {
            continue;
        }

        // "local->remote" for a connection; the local side is the port in use.
        let name_field = parts[8].split("->").next().unwrap_or(parts[8]);

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
                    state: parts
                        .get(9)
                        .map(|s| s.trim_matches(|c| c == '(' || c == ')').to_string())
                        .unwrap_or_default(),
                    process_name: None,
                });
            }
        }
    }

    Ok(connections)
}

/// UDP sockets from lsof: bound but unconnected ones, or connected ones too
/// with `include_connections` (their name reads `local->remote`).
pub fn get_udp_sockets(include_connections: bool) -> Result<Vec<NetworkConnection>> {
    let output = Command::new("lsof").args(["-iUDP", "-P", "-n"]).output()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut sockets = Vec::new();
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }
        let connected = parts[8].contains("->");
        if connected && !include_connections {
            continue;
        }
        let name = parts[8].split("->").next().unwrap_or(parts[8]);
        let Some((addr, port)) = name.rsplit_once(':') else { continue };
        let Ok(port) = port.parse::<u16>() else { continue };
        sockets.push(NetworkConnection {
            local_address: addr.trim_start_matches('[').trim_end_matches(']').to_string(),
            local_port: port,
            remote_address: String::new(),
            remote_port: 0,
            protocol: Protocol::UDP,
            pid: parts[1].parse().unwrap_or(0),
            state: if connected { "CONNECTED" } else { "LISTEN" }.to_string(),
            process_name: None,
        });
    }
    Ok(sockets)
}

pub fn is_system_process(pid: u32) -> bool {
    // macOS system processes typically have PID < 500
    pid < 500
}
