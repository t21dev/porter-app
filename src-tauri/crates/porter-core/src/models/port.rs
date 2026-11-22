use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

pub use crate::containers::Container;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortStatus {
    Free,
    Occupied,
    System,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Port {
    pub port: u16,
    pub status: PortStatus,
    pub protocol: Protocol,
    pub process: Option<Process>,
    pub ip_address: String,
    /// The Docker or Podman container that publishes this port. Filled in only
    /// by the container-aware scan the CLI uses; the desktop app leaves it out.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub container: Option<Container>,
}

/// The process behind a port. The list only needs the name and PID, so the
/// rest is filled in by get_port_details alone and left out of the list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Process {
    pub pid: u32,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub working_dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_usage: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}

impl Process {
    pub fn named(pid: u32, name: String) -> Self {
        Self {
            pid,
            name,
            path: None,
            command: None,
            working_dir: None,
            memory_usage: None,
            started_at: None,
            user: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub hostname: String,
    pub cpu_count: usize,
    pub total_memory: u64,
}
