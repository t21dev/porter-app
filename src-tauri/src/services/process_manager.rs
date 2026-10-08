use crate::platform;
use anyhow::{Result, anyhow};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};

/// Whether a process is running now. A fresh snapshot, because a refresh of
/// specific PIDs never drops the ones that have exited from the list.
fn is_running(pid: Pid) -> bool {
    let mut sys = System::new();
    sys.refresh_processes_specifics(ProcessesToUpdate::Some(&[pid]), ProcessRefreshKind::new());
    sys.process(pid).is_some()
}

#[cfg(not(target_os = "windows"))]
use sysinfo::Signal;

#[cfg(not(target_os = "windows"))]
use std::process::Command;

pub struct ProcessManager {
    system: System,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            system: System::new(),
        }
    }

    /// Kill a process by PID
    pub fn kill_process(&mut self, pid: u32) -> Result<bool> {
        #[cfg(target_os = "linux")]
        if platform::flatpak::is_sandboxed() {
            return kill_host_process(pid);
        }

        let pid_obj = Pid::from_u32(pid);
        // Only the process being killed, not every process on the machine.
        self.system
            .refresh_processes_specifics(ProcessesToUpdate::Some(&[pid_obj]), ProcessRefreshKind::new());

        if let Some(process) = self.system.process(pid_obj) {
            // On Windows, try direct kill. On Unix, try SIGTERM first
            #[cfg(target_os = "windows")]
            {
                // Windows: use kill() directly (sends SIGKILL equivalent)
                if process.kill() {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    if !is_running(pid_obj) {
                        return Ok(true);
                    }

                    // Still running? This might need admin privileges
                    return Err(anyhow!(
                        "Failed to kill process (PID: {}). This process may require administrator privileges to terminate.",
                        pid
                    ));
                } else {
                    return Err(anyhow!(
                        "Access denied when trying to kill process (PID: {}). You may need to run Porter as administrator.",
                        pid
                    ));
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                // Unix: Try SIGTERM first, then SIGKILL
                if process.kill_with(Signal::Term).unwrap_or(false) {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    if !is_running(pid_obj) {
                        return Ok(true);
                    }

                    // Force kill if still running
                    if let Some(process) = self.system.process(pid_obj) {
                        if process.kill() {
                            return Ok(true);
                        }
                    }
                }

                // Normal kill failed, try elevated kill
                return self.kill_process_elevated(pid);
            }
        }

        Err(anyhow!("Process not found: PID {}", pid))
    }

    /// Attempt to kill a process with elevated privileges (macOS/Linux)
    #[cfg(target_os = "macos")]
    fn kill_process_elevated(&mut self, pid: u32) -> Result<bool> {
        // Use osascript to run kill with admin privileges
        // This shows the native macOS authentication dialog
        let script = format!(
            r#"do shell script "kill -9 {}" with administrator privileges"#,
            pid
        );

        let output = Command::new("osascript")
            .args(&["-e", &script])
            .output();

        match output {
            Ok(result) => {
                if result.status.success() {
                    // Verify the process is actually dead
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    self.system.refresh_processes(sysinfo::ProcessesToUpdate::All);

                    if self.system.process(Pid::from_u32(pid)).is_none() {
                        return Ok(true);
                    }
                    Err(anyhow!("Process {} did not terminate after elevated kill attempt.", pid))
                } else {
                    let stderr = String::from_utf8_lossy(&result.stderr);
                    if stderr.contains("User canceled") || stderr.contains("(-128)") {
                        Err(anyhow!("Authentication was canceled by user."))
                    } else {
                        Err(anyhow!("Failed to kill process with elevated privileges: {}", stderr))
                    }
                }
            }
            Err(e) => Err(anyhow!("Failed to request elevation: {}", e)),
        }
    }

    /// Attempt to kill a process with elevated privileges (Linux)
    #[cfg(target_os = "linux")]
    fn kill_process_elevated(&mut self, pid: u32) -> Result<bool> {
        // Try pkexec first (PolicyKit - provides graphical auth dialog)
        let pkexec_result = Command::new("pkexec")
            .args(&["kill", "-9", &pid.to_string()])
            .output();

        match pkexec_result {
            Ok(result) => {
                if result.status.success() {
                    // Verify the process is actually dead
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    self.system.refresh_processes(sysinfo::ProcessesToUpdate::All);

                    if self.system.process(Pid::from_u32(pid)).is_none() {
                        return Ok(true);
                    }
                    Err(anyhow!("Process {} did not terminate after elevated kill attempt.", pid))
                } else {
                    let stderr = String::from_utf8_lossy(&result.stderr);
                    if stderr.contains("dismissed") || stderr.contains("Not authorized") {
                        Err(anyhow!("Authentication was canceled or denied."))
                    } else {
                        Err(anyhow!(
                            "Failed to kill process (PID: {}). You may need to run Porter with sudo.",
                            pid
                        ))
                    }
                }
            }
            Err(_) => {
                // pkexec not available
                Err(anyhow!(
                    "Failed to kill process (PID: {}). Please install PolicyKit (pkexec) or run Porter with sudo.",
                    pid
                ))
            }
        }
    }

    /// Kill process by port number
    pub fn kill_process_by_port(&mut self, port: u16) -> Result<bool> {
        let connections = platform::get_network_connections(true)?;

        for conn in connections {
            if conn.local_port == port && conn.pid > 0 {
                return self.kill_process(conn.pid);
            }
        }

        Err(anyhow!("Port {} is not in use", port))
    }
}

/// Inside Flatpak, the same steps as below (SIGTERM, then SIGKILL, then
/// pkexec), each run on the host, where the process lives.
#[cfg(target_os = "linux")]
fn kill_host_process(pid: u32) -> Result<bool> {
    use platform::flatpak::{is_running, kill_elevated, signal};
    use std::time::Duration;

    if !is_running(pid) {
        return Err(anyhow!("Process not found: PID {}", pid));
    }
    if signal(pid, "-TERM") {
        std::thread::sleep(Duration::from_millis(500));
        if !is_running(pid) || signal(pid, "-KILL") {
            return Ok(true);
        }
    }

    let result = kill_elevated(pid).map_err(|e| anyhow!("Failed to request elevation: {}", e))?;
    if result.status.success() {
        std::thread::sleep(Duration::from_millis(300));
        if !is_running(pid) {
            return Ok(true);
        }
        return Err(anyhow!("Process {} did not terminate after elevated kill attempt.", pid));
    }
    let stderr = String::from_utf8_lossy(&result.stderr);
    if stderr.contains("dismissed") || stderr.contains("Not authorized") {
        Err(anyhow!("Authentication was canceled or denied."))
    } else {
        Err(anyhow!(
            "Failed to kill process (PID: {}). Please install PolicyKit (pkexec) on the host.",
            pid
        ))
    }
}
