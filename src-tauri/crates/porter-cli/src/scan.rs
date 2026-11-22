//! One scan of the machine, each port paired with Porter's advice on it.

use anyhow::Result;
use porter_core::advisor::{advise, Advice, Exposure, Risk};
use porter_core::models::{Port, Protocol};
use porter_core::services::{PortMonitor, ScanOptions};

pub struct Row {
    pub port: Port,
    pub advice: Advice,
}

#[derive(Clone, Copy)]
pub struct Options {
    /// Also the local end of outgoing connections, not only listeners.
    pub connections: bool,
    /// Ask Docker and Podman which container publishes each port.
    pub containers: bool,
    /// UDP sockets too, not only TCP.
    pub udp: bool,
}

/// Every port in use, riskiest first, then by port number.
pub fn scan(opts: Options) -> Result<Vec<Row>> {
    let ports = PortMonitor::new().get_ports(ScanOptions {
        connections: opts.connections,
        udp: opts.udp,
        containers: opts.containers,
    })?;
    let mut rows: Vec<Row> = ports
        .into_iter()
        .map(|port| Row {
            advice: advise(&port),
            port,
        })
        .collect();
    sort(&mut rows, SortBy::Risk);
    Ok(rows)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum SortBy {
    Risk,
    Port,
}

pub fn sort(rows: &mut [Row], by: SortBy) {
    match by {
        SortBy::Risk => rows.sort_by(|a, b| {
            b.advice
                .risk
                .cmp(&a.advice.risk)
                .then(a.port.port.cmp(&b.port.port))
        }),
        SortBy::Port => rows.sort_by_key(|r| r.port.port),
    }
}

impl Row {
    /// Who holds the port: the container, else the process, else `?`.
    pub fn owner(&self) -> String {
        match (&self.port.container, &self.port.process) {
            (Some(c), _) => format!("{} [{}]", c.name, c.runtime),
            (None, Some(p)) => p.name.clone(),
            (None, None) => "?".to_string(),
        }
    }

    /// What identifies a row across scans: port number and protocol.
    pub fn key(&self) -> (u16, &'static str) {
        (self.port.port, self.proto())
    }

    pub fn pid(&self) -> Option<u32> {
        self.port.process.as_ref().map(|p| p.pid).filter(|p| *p > 0)
    }

    pub fn proto(&self) -> &'static str {
        match self.port.protocol {
            Protocol::TCP => "tcp",
            Protocol::UDP => "udp",
        }
    }

    pub fn service(&self) -> &str {
        self.advice.service.unwrap_or("unknown")
    }

    pub fn exposed(&self) -> bool {
        self.advice.exposure != Exposure::Local
    }

    /// Whether a filter typed by the user matches this row: port number,
    /// owner, service or container image, case-insensitive.
    pub fn matches(&self, filter: &str) -> bool {
        if filter.is_empty() {
            return true;
        }
        let f = filter.to_ascii_lowercase();
        self.port.port.to_string().contains(&f)
            || self.owner().to_ascii_lowercase().contains(&f)
            || self.service().to_ascii_lowercase().contains(&f)
            || self
                .port
                .container
                .as_ref()
                .is_some_and(|c| c.image.to_ascii_lowercase().contains(&f))
    }
}

pub fn count(rows: &[Row], risk: Risk) -> usize {
    rows.iter().filter(|r| r.advice.risk == risk).count()
}

/// Whether this run can see every port's owner. On Linux and macOS another
/// user's processes are hidden unless Porter runs as root.
pub fn elevated() -> bool {
    porter_core::services::admin::is_elevated()
}
