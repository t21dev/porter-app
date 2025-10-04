use crate::platform;
use anyhow::{Result, anyhow};
use sysinfo::{Pid, Signal, System};

pub struct ProcessManager {
    system: System,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    /// Kill a process by PID
    pub fn kill_process(&mut self, pid: u32) -> Result<bool> {
        self.system.refresh_processes(sysinfo::ProcessesToUpdate::All);

        let pid_obj = Pid::from_u32(pid);

        if let Some(process) = self.system.process(pid_obj) {
            // On Windows, try direct kill. On Unix, try SIGTERM first
            #[cfg(target_os = "windows")]
            {
                // Windows: use kill() directly (sends SIGKILL equivalent)
                if process.kill() {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    self.system.refresh_processes(sysinfo::ProcessesToUpdate::All);

                    if self.system.process(pid_obj).is_none() {
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
                    self.system.refresh_processes(sysinfo::ProcessesToUpdate::All);

                    if self.system.process(pid_obj).is_none() {
                        return Ok(true);
                    }

                    // Force kill if still running
                    if let Some(process) = self.system.process(pid_obj) {
                        if process.kill() {
                            return Ok(true);
                        }
                    }
                }

                return Err(anyhow!(
                    "Failed to kill process (PID: {}). You may need sudo/root privileges.",
                    pid
                ));
            }
        }

        Err(anyhow!("Process not found: PID {}", pid))
    }

    /// Kill process by port number
    pub fn kill_process_by_port(&mut self, port: u16) -> Result<bool> {
        let connections = platform::get_network_connections()?;

        for conn in connections {
            if conn.local_port == port && conn.pid > 0 {
                return self.kill_process(conn.pid);
            }
        }

        Err(anyhow!("Port {} is not in use", port))
    }
}
