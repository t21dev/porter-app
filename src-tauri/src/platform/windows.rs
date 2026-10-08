use super::{NetworkConnection, Protocol};
use anyhow::Result;

#[cfg(target_os = "windows")]
use windows::Win32::NetworkManagement::IpHelper::*;
#[cfg(target_os = "windows")]
use windows::Win32::Networking::WinSock::*;

/// TCP sockets, IPv4 and IPv6: listeners only, or every connection too.
///
/// Listeners are the default: the table of all connections also holds the
/// local end of every outgoing connection (browser tabs, sync clients), which
/// on a normal desktop is most of the rows and costs a process lookup each.
/// IPv6 is included because a dev server bound to "localhost" often listens on
/// ::1 alone, and used to show as free.
#[cfg(target_os = "windows")]
pub fn get_network_connections(include_connections: bool) -> Result<Vec<NetworkConnection>> {
    let class = if include_connections {
        TCP_TABLE_OWNER_PID_ALL
    } else {
        TCP_TABLE_OWNER_PID_LISTENER
    };
    let mut connections = Vec::new();
    unsafe {
        if let Some(buffer) = tcp_table(AF_INET.0 as u32, class) {
            let table = &*(buffer.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
            let entries =
                std::slice::from_raw_parts(table.table.as_ptr(), table.dwNumEntries as usize);
            for entry in entries {
                let ip = std::net::Ipv4Addr::from(u32::from_be(entry.dwLocalAddr));
                connections.push(NetworkConnection {
                    local_address: ip.to_string(),
                    local_port: u16::from_be(entry.dwLocalPort as u16),
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol: Protocol::TCP,
                    pid: entry.dwOwningPid,
                    state: format_tcp_state(entry.dwState),
                    process_name: None,
                });
            }
        }
        if let Some(buffer) = tcp_table(AF_INET6.0 as u32, class) {
            let table = &*(buffer.as_ptr() as *const MIB_TCP6TABLE_OWNER_PID);
            let entries =
                std::slice::from_raw_parts(table.table.as_ptr(), table.dwNumEntries as usize);
            for entry in entries {
                let ip = std::net::Ipv6Addr::from(entry.ucLocalAddr);
                connections.push(NetworkConnection {
                    local_address: ip.to_string(),
                    local_port: u16::from_be(entry.dwLocalPort as u16),
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol: Protocol::TCP,
                    pid: entry.dwOwningPid,
                    state: format_tcp_state(entry.dwState),
                    process_name: None,
                });
            }
        }
    }
    Ok(connections)
}

/// One TCP table for one address family, or None if it cannot be read.
/// Retries if the table grows between the size query and the read.
#[cfg(target_os = "windows")]
unsafe fn tcp_table(family: u32, class: TCP_TABLE_CLASS) -> Option<Vec<u32>> {
    let mut size: u32 = 0;
    let _ = GetExtendedTcpTable(None, &mut size, false, family, class, 0);
    for _ in 0..4 {
        if size == 0 {
            return None;
        }
        // u32 elements keep the buffer aligned for the table structs.
        let mut buffer = vec![0u32; (size as usize).div_ceil(4)];
        let result = GetExtendedTcpTable(
            Some(buffer.as_mut_ptr() as *mut _),
            &mut size,
            false,
            family,
            class,
            0,
        );
        match result {
            0 => return Some(buffer),
            // ERROR_INSUFFICIENT_BUFFER: the table grew, size now holds the new size
            122 => continue,
            _ => return None,
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn format_tcp_state(state: u32) -> String {
    match state {
        1 => "CLOSED",
        2 => "LISTEN",
        3 => "SYN_SENT",
        4 => "SYN_RCVD",
        5 => "ESTABLISHED",
        6 => "FIN_WAIT1",
        7 => "FIN_WAIT2",
        8 => "CLOSE_WAIT",
        9 => "CLOSING",
        10 => "LAST_ACK",
        11 => "TIME_WAIT",
        12 => "DELETE_TCB",
        _ => "UNKNOWN",
    }
    .to_string()
}

#[cfg(target_os = "windows")]
pub fn is_system_process(pid: u32) -> bool {
    // Windows system processes typically have PID < 1000
    pid < 1000
}

#[cfg(not(target_os = "windows"))]
pub fn get_network_connections(_include_connections: bool) -> Result<Vec<NetworkConnection>> {
    Ok(Vec::new())
}

#[cfg(not(target_os = "windows"))]
pub fn is_system_process(_pid: u32) -> bool {
    false
}
