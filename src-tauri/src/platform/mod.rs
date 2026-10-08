#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::*;
#[cfg(target_os = "linux")]
pub mod flatpak;

use crate::models::Protocol;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct NetworkConnection {
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub protocol: Protocol,
    pub pid: u32,
    pub state: String,
    /// The owner's name, where the platform learns it along with the socket
    /// (inside Flatpak, from the host's `ss`). Otherwise it comes from the PID.
    pub process_name: Option<String>,
}

/// One listening socket read from /proc/net/tcp or /proc/net/tcp6.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
#[derive(Debug, PartialEq)]
pub(crate) struct ProcListener {
    pub address: String,
    pub port: u16,
    pub inode: u64,
    pub listening: bool,
}

/// The sockets in the text of /proc/net/tcp or /proc/net/tcp6: listeners
/// (state 0A, TCP_LISTEN) only, or every connection with `include_connections`.
/// Lives here rather than in linux.rs so it is compiled and tested everywhere.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub(crate) fn parse_proc_net_tcp(content: &str, include_connections: bool) -> Vec<ProcListener> {
    content
        .lines()
        .skip(1)
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            let listening = parts.get(3) == Some(&"0A");
            if parts.len() < 10 || !(listening || include_connections) {
                return None;
            }
            let (addr, port) = parts[1].split_once(':')?;
            Some(ProcListener {
                address: parse_proc_address(addr)?,
                port: u16::from_str_radix(port, 16).ok()?,
                inode: parts[9].parse().ok()?,
                listening,
            })
        })
        .collect()
}

/// The kernel prints each 32-bit word of the address as a host-order integer,
/// so each 8-digit group is parsed and its bytes read back little-endian.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
fn parse_proc_address(hex: &str) -> Option<String> {
    let mut bytes = Vec::with_capacity(16);
    for chunk in hex.as_bytes().chunks(8) {
        let word = u32::from_str_radix(std::str::from_utf8(chunk).ok()?, 16).ok()?;
        bytes.extend_from_slice(&word.to_le_bytes());
    }
    match bytes.len() {
        4 => Some(std::net::Ipv4Addr::new(bytes[0], bytes[1], bytes[2], bytes[3]).to_string()),
        16 => {
            let arr: [u8; 16] = bytes.try_into().ok()?;
            Some(std::net::Ipv6Addr::from(arr).to_string())
        }
        _ => None,
    }
}

/// The owner of each socket in the output of `ss -Htanpe`, by inode: the PID
/// and name of the first process listed, as in
/// `users:(("node",pid=4242,fd=21)) uid:1000 ino:41234 sk:1 <->`.
/// Sockets with no owner shown (another user's, or none left) are skipped.
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub(crate) fn parse_ss_owners(output: &str) -> HashMap<u64, (u32, String)> {
    output
        .lines()
        .filter_map(|line| {
            let inode: u64 = line
                .split_whitespace()
                .find_map(|field| field.strip_prefix("ino:"))?
                .parse()
                .ok()?;
            let users = &line[line.find("users:((\"")? + 9..];
            let (name, rest) = users.split_once("\",pid=")?;
            let pid = rest.split(|c: char| !c.is_ascii_digit()).next()?.parse().ok()?;
            (inode != 0).then(|| (inode, (pid, name.to_string())))
        })
        .collect()
}

/// The inode in a /proc/<pid>/fd link such as "socket:[12345]".
#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
pub(crate) fn socket_inode(link: &str) -> Option<u64> {
    link.strip_prefix("socket:[")?.strip_suffix(']')?.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TCP: &str = "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0100007F:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 41234 1 0000000000000000 100 0 0 10 0
   1: 0100007F:9C40 0100007F:1F90 01 00000000:00000000 00:00000000 00000000  1000        0 41299 1 0000000000000000 20 4 30 10 -1";

    #[test]
    fn only_listeners_are_kept() {
        assert_eq!(
            parse_proc_net_tcp(TCP, false),
            vec![ProcListener {
                address: "127.0.0.1".into(),
                port: 8080,
                inode: 41234,
                listening: true
            }]
        );
    }

    #[test]
    fn connections_come_back_when_asked_for() {
        let all = parse_proc_net_tcp(TCP, true);
        assert_eq!(all.len(), 2);
        assert_eq!((all[1].port, all[1].listening), (40000, false));
    }

    #[test]
    fn ipv6_addresses_parse() {
        let tcp6 = "  sl  local_address remote_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode
   0: 00000000000000000000000001000000:1435 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 5555 1 0000000000000000 100 0 0 10 0";
        assert_eq!(
            parse_proc_net_tcp(tcp6, false),
            vec![ProcListener {
                address: "::1".into(),
                port: 5173,
                inode: 5555,
                listening: true
            }]
        );
    }

    #[test]
    fn ss_lines_give_the_owner_of_each_inode() {
        let ss = r#"LISTEN 0      511          127.0.0.1:5173      0.0.0.0:*     users:(("node",pid=4242,fd=21)) uid:1000 ino:41234 sk:1 cgroup:/user.slice <->
LISTEN 0      4096           0.0.0.0:22        0.0.0.0:*     ino:1999 sk:2 cgroup:/system.slice/ssh.service <->
ESTAB  0      0            127.0.0.1:40000   127.0.0.1:5173  users:(("my app",pid=77,fd=3),("my app",pid=78,fd=3)) timer:(keepalive,1min,0) uid:1000 ino:41299 sk:3 <->
TIME-WAIT 0   0            127.0.0.1:40002   127.0.0.1:5173  timer:(timewait,30sec,0) ino:0 sk:4"#;
        let owners = parse_ss_owners(ss);
        assert_eq!(owners.len(), 2);
        assert_eq!(owners[&41234], (4242, "node".to_string()));
        assert_eq!(owners[&41299], (77, "my app".to_string()));
    }

    #[test]
    fn socket_links_give_their_inode() {
        assert_eq!(socket_inode("socket:[41234]"), Some(41234));
        assert_eq!(socket_inode("/dev/null"), None);
        assert_eq!(socket_inode("pipe:[77]"), None);
    }
}
