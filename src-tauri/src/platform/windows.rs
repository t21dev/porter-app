use super::{NetworkConnection, Protocol};
use anyhow::Result;

#[cfg(target_os = "windows")]
use windows::Win32::NetworkManagement::IpHelper::*;
#[cfg(target_os = "windows")]
use windows::Win32::Networking::WinSock::*;

#[cfg(target_os = "windows")]
pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    unsafe {
        // Get TCP connections
        let mut size: u32 = 0;

        // Get required buffer size
        let _ = GetExtendedTcpTable(
            None,
            &mut size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if size == 0 {
            return Ok(connections);
        }

        // Allocate buffer
        let mut buffer = vec![0u8; size as usize];

        // Get TCP table
        let result = GetExtendedTcpTable(
            Some(buffer.as_mut_ptr() as *mut _),
            &mut size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if result.is_ok() {
            let table = &*(buffer.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
            let entries = std::slice::from_raw_parts(
                &table.table[0],
                table.dwNumEntries as usize,
            );

            for entry in entries {
                let local_addr = format!(
                    "{}.{}.{}.{}",
                    entry.dwLocalAddr & 0xFF,
                    (entry.dwLocalAddr >> 8) & 0xFF,
                    (entry.dwLocalAddr >> 16) & 0xFF,
                    (entry.dwLocalAddr >> 24) & 0xFF,
                );

                let local_port = u16::from_be(entry.dwLocalPort as u16);

                connections.push(NetworkConnection {
                    local_address: local_addr,
                    local_port,
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol: Protocol::TCP,
                    pid: entry.dwOwningPid,
                    state: format_tcp_state(entry.dwState),
                });
            }
        }
    }

    Ok(connections)
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
pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    Ok(Vec::new())
}

#[cfg(not(target_os = "windows"))]
pub fn is_system_process(_pid: u32) -> bool {
    false
}
