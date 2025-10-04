use anyhow::Result;

/// Check if the current process is running with elevated privileges
pub fn is_elevated() -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HANDLE;
        use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        unsafe {
            let mut token = HANDLE::default();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_ok() {
                let mut elevation = TOKEN_ELEVATION::default();
                let mut size = 0u32;

                if GetTokenInformation(
                    token,
                    TokenElevation,
                    Some(&mut elevation as *mut _ as *mut _),
                    std::mem::size_of::<TOKEN_ELEVATION>() as u32,
                    &mut size,
                ).is_ok() {
                    return elevation.TokenIsElevated != 0;
                }
            }
        }
        false
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix, check if we're running as root (UID 0)
        unsafe { libc::geteuid() == 0 }
    }
}

/// Request elevated privileges (restart the app with admin rights)
pub fn request_elevation() -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        let exe_path = std::env::current_exe()?;

        // Use Windows ShellExecute with "runas" verb to request UAC elevation
        Command::new("powershell")
            .args(&[
                "-WindowStyle", "Hidden",
                "-Command",
                &format!(
                    "Start-Process -FilePath '{}' -Verb RunAs",
                    exe_path.display()
                ),
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()?;

        // Exit current instance
        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        anyhow::bail!("Please restart Porter with sudo/root privileges to kill system processes.");
    }
}
