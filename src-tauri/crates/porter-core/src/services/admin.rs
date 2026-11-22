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

/// The package family name when Porter runs from its MSIX (the Microsoft
/// Store install), or `None` for the installer, portable and dev builds.
pub fn package_family_name() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        #[link(name = "kernel32")]
        extern "system" {
            fn GetCurrentPackageFamilyName(length: *mut u32, name: *mut u16) -> i32;
        }
        const ERROR_SUCCESS: i32 = 0;

        // A family name is at most 64 characters plus the terminating null.
        let mut buf = [0u16; 128];
        let mut len = buf.len() as u32;
        // Unpackaged processes get APPMODEL_ERROR_NO_PACKAGE instead.
        if unsafe { GetCurrentPackageFamilyName(&mut len, buf.as_mut_ptr()) } != ERROR_SUCCESS {
            return None;
        }
        let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        Some(String::from_utf16_lossy(&buf[..end]))
    }

    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

/// Request elevated privileges (restart the app with admin rights)
pub fn request_elevation() -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        // A Store install relaunches through its app entry: started from its
        // exe path inside WindowsApps it would run without package identity.
        let target = match package_family_name() {
            Some(family) => format!("shell:AppsFolder\\{family}!Porter"),
            None => std::env::current_exe()?.display().to_string(),
        };

        // Use Windows ShellExecute with "runas" verb to request UAC elevation
        Command::new("powershell")
            .args(&[
                "-WindowStyle", "Hidden",
                "-Command",
                &format!("Start-Process -FilePath '{}' -Verb RunAs", target),
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()?;

        // Exit current instance
        std::process::exit(0);
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, we don't need to restart the app.
        // Elevation is requested per-operation when killing processes.
        // This is handled in process_manager.rs using osascript
        anyhow::bail!(
            "On macOS, you don't need to restart the app. \
            When you try to kill a process that requires elevated privileges, \
            you'll be prompted for your password automatically."
        );
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, we don't need to restart the app.
        // Elevation is requested per-operation when killing processes.
        // This is handled in process_manager.rs using pkexec
        anyhow::bail!(
            "On Linux, you don't need to restart the app. \
            When you try to kill a process that requires elevated privileges, \
            you'll be prompted for your password automatically (requires PolicyKit/pkexec)."
        );
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        anyhow::bail!("Please restart Porter with sudo/root privileges to kill system processes.");
    }
}
