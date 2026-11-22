//! Ports published by Docker and Podman containers.
//!
//! The socket table alone names `docker-proxy`, `rootlessport` or
//! `com.docker.backend` as the owner of a published port, which says nothing
//! about what runs there. And with Docker's userland proxy turned off a
//! published port has no listening socket at all: iptables forwards it
//! straight to the container, so it is missing from the table entirely. Both
//! are fixed by asking the container runtimes which ports they publish.

use crate::models::Protocol;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// The container behind a published port.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Container {
    /// `docker` or `podman`.
    pub runtime: String,
    pub id: String,
    pub name: String,
    pub image: String,
    /// The port inside the container that the host port forwards to.
    pub container_port: u16,
}

/// One host port a container publishes.
#[derive(Debug, Clone, PartialEq)]
pub struct PublishedPort {
    /// The host address it is published on: `0.0.0.0`, `::` or one address.
    pub host_ip: String,
    pub host_port: u16,
    pub protocol: Protocol,
    pub container: Container,
}

/// How long a runtime may take to answer. A stopped Docker Desktop or a
/// wedged daemon must not stall a scan.
const TIMEOUT: Duration = Duration::from_secs(3);

/// How long one answer from the runtimes is reused. The desktop app polls
/// every few seconds; containers come and go far less often than that, and a
/// stopped Docker Desktop can take a while to say so.
const CACHE_FOR: Duration = Duration::from_secs(10);

/// The ports every reachable runtime publishes, reused for `CACHE_FOR`. A
/// runtime that isn't installed, isn't running or refuses this user (no
/// access to the Docker socket) adds nothing.
pub fn published_ports() -> Vec<PublishedPort> {
    use std::sync::Mutex;
    static CACHE: Mutex<Option<(Instant, Vec<PublishedPort>)>> = Mutex::new(None);
    if let Ok(cache) = CACHE.lock() {
        if let Some((at, ports)) = cache.as_ref() {
            if at.elapsed() < CACHE_FOR {
                return ports.clone();
            }
        }
    }
    let fresh = query_runtimes();
    if let Ok(mut cache) = CACHE.lock() {
        *cache = Some((Instant::now(), fresh.clone()));
    }
    fresh
}

fn query_runtimes() -> Vec<PublishedPort> {
    let mut out = Vec::new();
    for runtime in ["docker", "podman"] {
        if let Some(text) = run_ps(runtime) {
            out.extend(parse_ps(runtime, &text));
        }
    }
    // Podman can stand in for Docker (`podman-docker`), and then both list the
    // same containers.
    out.sort_by(|a, b| (a.host_port, &a.container.id).cmp(&(b.host_port, &b.container.id)));
    out.dedup_by(|a, b| {
        a.host_port == b.host_port && a.host_ip == b.host_ip && a.container.id == b.container.id
    });
    out
}

/// `<runtime> ps` with one tab-separated line per running container, or None
/// if it fails or takes longer than `TIMEOUT`.
fn run_ps(runtime: &str) -> Option<String> {
    let mut cmd = Command::new(runtime);
    cmd.args(["ps", "--no-trunc", "--format", "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let mut child = cmd.spawn().ok()?;
    // Read on another thread so a long listing can't fill the pipe and block
    // the child while it is being waited on.
    let mut stdout = child.stdout.take()?;
    let reader = std::thread::spawn(move || {
        let mut s = String::new();
        stdout.read_to_string(&mut s).ok().map(|_| s)
    });
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return reader.join().ok().flatten(),
            Ok(Some(_)) | Err(_) => return None,
            Ok(None) if started.elapsed() > TIMEOUT => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(15)),
        }
    }
}

/// Parse the lines `run_ps` asks for.
pub(crate) fn parse_ps(runtime: &str, text: &str) -> Vec<PublishedPort> {
    let mut out = Vec::new();
    for line in text.lines() {
        let mut f = line.splitn(4, '\t');
        let (Some(id), Some(name), Some(image), Some(ports)) = (f.next(), f.next(), f.next(), f.next())
        else {
            continue;
        };
        for p in parse_ports_field(ports) {
            out.push(PublishedPort {
                host_ip: p.host_ip,
                host_port: p.host_port,
                protocol: p.protocol,
                container: Container {
                    runtime: runtime.to_string(),
                    id: id.chars().take(12).collect(),
                    name: name.split(',').next().unwrap_or(name).to_string(),
                    image: image.to_string(),
                    container_port: p.container_port,
                },
            });
        }
    }
    out
}

#[derive(Debug, PartialEq)]
pub(crate) struct PortMapping {
    pub host_ip: String,
    pub host_port: u16,
    pub container_port: u16,
    pub protocol: Protocol,
}

/// The published ports in a `{{.Ports}}` field, such as
/// `0.0.0.0:8080->80/tcp, [::]:8080->80/tcp, 127.0.0.1:5000-5001->5000-5001/tcp, 9000/tcp`.
/// Ranges expand to one entry per port. Exposed but unpublished ports
/// (`9000/tcp`, no `->`) aren't reachable from the host and are skipped.
pub(crate) fn parse_ports_field(field: &str) -> Vec<PortMapping> {
    let mut out = Vec::new();
    for item in field.split(',').map(str::trim) {
        let Some((host, inner)) = item.split_once("->") else { continue };
        let (inner_ports, proto) = inner.split_once('/').unwrap_or((inner, "tcp"));
        let protocol = if proto.eq_ignore_ascii_case("udp") { Protocol::UDP } else { Protocol::TCP };
        let Some((ip, host_ports)) = host.rsplit_once(':') else { continue };
        let ip = ip.trim_start_matches('[').trim_end_matches(']');
        let ip = if ip.is_empty() || ip == "::" { "::" } else { ip };
        let (Some(h), Some(c)) = (parse_range(host_ports), parse_range(inner_ports)) else {
            continue;
        };
        for (i, host_port) in (h.0..=h.1).enumerate() {
            // A range maps one to one; a single container port takes them all.
            let container_port = if c.0 == c.1 { c.0 } else { c.0.saturating_add(i as u16) };
            out.push(PortMapping {
                host_ip: ip.to_string(),
                host_port,
                container_port,
                protocol: protocol.clone(),
            });
        }
    }
    out
}

fn parse_range(s: &str) -> Option<(u16, u16)> {
    match s.split_once('-') {
        Some((a, b)) => {
            let (a, b) = (a.parse().ok()?, b.parse().ok()?);
            // Guard against a garbled field turning into 65k entries.
            (a <= b && b - a <= 1024).then_some((a, b))
        }
        None => s.parse().ok().map(|p| (p, p)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn docker_ports_field_parses() {
        let m = parse_ports_field("0.0.0.0:8080->80/tcp, :::8080->80/tcp, 9000/tcp");
        assert_eq!(m.len(), 2);
        assert_eq!(
            m[0],
            PortMapping { host_ip: "0.0.0.0".into(), host_port: 8080, container_port: 80, protocol: Protocol::TCP }
        );
        assert_eq!(m[1].host_ip, "::");
    }

    #[test]
    fn bracketed_ipv6_loopback_and_udp_parse() {
        let m = parse_ports_field("[::]:53->53/udp, 127.0.0.1:5432->5432/tcp");
        assert_eq!((m[0].host_ip.as_str(), m[0].protocol.clone()), ("::", Protocol::UDP));
        assert_eq!((m[1].host_ip.as_str(), m[1].host_port), ("127.0.0.1", 5432));
    }

    #[test]
    fn ranges_expand_one_to_one() {
        let m = parse_ports_field("0.0.0.0:7000-7002->8000-8002/tcp");
        let pairs: Vec<_> = m.iter().map(|p| (p.host_port, p.container_port)).collect();
        assert_eq!(pairs, vec![(7000, 8000), (7001, 8001), (7002, 8002)]);
    }

    #[test]
    fn nonsense_is_skipped() {
        assert!(parse_ports_field("").is_empty());
        assert!(parse_ports_field("0.0.0.0:1-65535->1-65535/tcp").is_empty());
        assert!(parse_ports_field("garbage->/tcp").is_empty());
    }

    #[test]
    fn ps_lines_become_published_ports() {
        let text = "3f2a9c1b7d4e5f60718293a4b5c6d7e8\tdb,db-alias\tpostgres:16\t0.0.0.0:15432->5432/tcp\n\
                    aa11\tcache\tredis:7\t6379/tcp\n";
        let p = parse_ps("docker", text);
        assert_eq!(p.len(), 1);
        assert_eq!(p[0].host_port, 15432);
        assert_eq!(p[0].container.name, "db");
        assert_eq!(p[0].container.id, "3f2a9c1b7d4e");
        assert_eq!(p[0].container.container_port, 5432);
    }
}
