use crate::platform;
use anyhow::{Result, anyhow};
use sysinfo::{Pid, ProcessExt, Signal, System, SystemExt, PidExt};

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
        self.system.refresh_processes();

        let pid_obj = Pid::from(pid as usize);

        if let Some(process) = self.system.process(pid_obj) {
            // Try graceful termination first
            if process.kill_with(Signal::Term).is_some() {
                std::thread::sleep(std::time::Duration::from_millis(500));

                // Check if still running
                self.system.refresh_processes();
                if self.system.process(pid_obj).is_none() {
                    return Ok(true);
                }

                // Force kill if still running
                if let Some(process) = self.system.process(pid_obj) {
                    process.kill();
                }

                return Ok(true);
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
