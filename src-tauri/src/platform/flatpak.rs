//! Porter inside a Flatpak sandbox.
//!
//! The sandbox shares the host's network, so /proc/net/tcp still lists every
//! socket on the machine, but it has its own process namespace: /proc shows
//! only Porter's own processes, and nothing outside can be signalled. So the
//! owner of each socket, a process's details and the kill all go through
//! `flatpak-spawn --host`, which runs a command on the host. That needs the
//! `--talk-name=org.freedesktop.Flatpak` permission in the manifest.

use super::parse_ss_owners;
use crate::models::Process;
use std::collections::HashMap;
use std::path::Path;
use std::process::{Command, Output};
use std::sync::OnceLock;

/// Whether Porter is running inside Flatpak, which writes /.flatpak-info into
/// every sandbox.
pub fn is_sandboxed() -> bool {
    static SANDBOXED: OnceLock<bool> = OnceLock::new();
    *SANDBOXED.get_or_init(|| Path::new("/.flatpak-info").exists())
}

/// Run a command on the host. The sbin directories are added to its PATH
/// because some distributions keep `ss` there and leave them out of a user's.
fn host(args: &[&str]) -> std::io::Result<Output> {
    Command::new("flatpak-spawn")
        .args(["--host", "/bin/sh", "-c", r#"PATH="$PATH:/usr/sbin:/sbin" exec "$@""#, "sh"])
        .args(args)
        .output()
}

/// The PID and name behind each socket inode, from the host's `ss`. Empty if
/// `ss` is missing or the host can't be reached; the ports still show, without
/// their owners.
pub fn socket_owners() -> HashMap<u64, (u32, String)> {
    match host(&["ss", "-Htanpe"]) {
        Ok(out) if out.status.success() => parse_ss_owners(&String::from_utf8_lossy(&out.stdout)),
        _ => HashMap::new(),
    }
}

/// Whether a host process is still running.
pub fn is_running(pid: u32) -> bool {
    host(&["test", "-e", &format!("/proc/{pid}")])
        .map(|out| out.status.success())
        .unwrap_or(false)
}

/// Send a signal (`-TERM`, `-KILL`) to a host process. False if it was refused.
pub fn signal(pid: u32, signal: &str) -> bool {
    host(&["kill", signal, &pid.to_string()])
        .map(|out| out.status.success())
        .unwrap_or(false)
}

/// `pkexec kill -9` on the host, which shows the desktop's password prompt.
pub fn kill_elevated(pid: u32) -> std::io::Result<Output> {
    host(&["pkexec", "kill", "-9", &pid.to_string()])
}

/// Everything the details view shows about one host process, read from the
/// host's /proc in a single call. A line is left empty when it can't be read,
/// such as the executable of another user's process.
const DETAILS: &str = r#"p=/proc/$1
[ -d "$p" ] || exit 1
cat "$p/comm"
echo "$(readlink "$p/exe")"
echo "$(readlink "$p/cwd")"
echo "$(tr '\0\n' '  ' < "$p/cmdline")"
echo "$(ps -o rss=,etimes= -p "$1")""#;

pub fn process_details(pid: u32) -> Option<Process> {
    let pid_arg = pid.to_string();
    let out = host(&["sh", "-c", DETAILS, "sh", &pid_arg]).ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let mut lines = text.lines().map(str::trim);
    let name = lines.next()?.to_string();
    let some = |s: Option<&str>| s.filter(|s| !s.is_empty()).map(str::to_string);
    let path = some(lines.next());
    let working_dir = some(lines.next());
    let command = some(lines.next());
    let mut usage = lines.next().unwrap_or("").split_whitespace();
    let memory_usage = usage.next().and_then(|kb| kb.parse::<u64>().ok()).map(|kb| kb * 1024);
    let started_at = usage
        .next()
        .and_then(|secs| secs.parse::<i64>().ok())
        .map(|secs| chrono::Utc::now() - chrono::Duration::seconds(secs));
    Some(Process {
        pid,
        name,
        path,
        command,
        working_dir,
        memory_usage,
        started_at,
        user: None,
    })
}
