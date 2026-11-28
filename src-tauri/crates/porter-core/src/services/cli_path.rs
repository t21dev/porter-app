//! Putting `porter`, the terminal version bundled with the desktop app, on
//! the PATH, so it runs from any terminal.
//!
//! Each install method differs:
//! - Windows installer (NSIS): it installs for all users in Program Files and
//!   puts Porter's folder on the system PATH, taking it off on uninstall. If
//!   that fails it falls back to the user's PATH, which the app's setting can
//!   undo or redo. (Up to 0.8.2 it installed per user, in AppData; the new
//!   installer removes that copy.)
//! - Windows MSI: the installer puts it on the system PATH itself (WiX), and
//!   removes it on uninstall. The app can only report that.
//! - Microsoft Store: an app execution alias provides `porter`.
//! - macOS: a link at /usr/local/bin/porter, made with the password prompt.
//!   Homebrew's cask links it for you.
//! - Linux .deb/.rpm: it is installed in /usr/bin, already on the PATH.

use serde::Serialize;
#[cfg(any(windows, target_os = "macos"))]
use std::path::Path;
use std::path::PathBuf;

/// Whether `porter` runs in a new terminal, and whether this app can change that.
#[derive(Debug, Clone, Serialize)]
pub struct CliStatus {
    /// The `porter` shipped next to this app, if there is one.
    pub bundled: Option<String>,
    /// A new terminal finds `porter`.
    pub on_path: bool,
    /// This app can add or remove it (the setting's switch is live).
    pub can_toggle: bool,
    /// Why not, or how to run it instead, when `can_toggle` is false.
    pub note: Option<String>,
}

const CLI_NAME: &str = if cfg!(windows) { "porter.exe" } else { "porter" };

/// The `porter` executable that ships with this install: the running program
/// itself when it is the CLI, otherwise the one beside the app or in its
/// `cli` folder.
///
/// The Store package and the portable zip name the app `Porter.exe`, which a
/// case-insensitive disk can't hold beside `porter.exe`, so they keep the CLI
/// in `cli\`. That also keeps the app off the PATH: only `cli` is added.
pub fn bundled_cli() -> Option<PathBuf> {
    find_cli(&std::env::current_exe().ok()?)
}

/// `bundled_cli` for a given running program, `me`.
fn find_cli(me: &std::path::Path) -> Option<PathBuf> {
    // Case-sensitive on purpose: `Porter.exe` is the app, not the CLI.
    if me.file_name().is_some_and(|n| n == CLI_NAME) {
        return Some(me.to_path_buf());
    }
    let dir = me.parent()?;
    [dir.join(CLI_NAME), dir.join("cli").join(CLI_NAME)]
        .into_iter()
        .find(|p| p.is_file() && !is_same_file(p, me))
}

/// Whether two paths are one file. Canonical paths come back in the disk's own
/// case, so `porter.exe` and `Porter.exe` in one folder compare equal on
/// Windows and macOS.
fn is_same_file(a: &std::path::Path, b: &std::path::Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    }
}

/// Every directory a new terminal searches, read fresh where the platform
/// allows (on Windows from the registry: this process's own PATH is the one
/// it started with, before the installer or the setting changed it).
fn path_dirs() -> Vec<PathBuf> {
    #[cfg(windows)]
    {
        let mut dirs = Vec::new();
        for (root, key) in [(windows_path::Root::User, windows_path::USER_KEY), (windows_path::Root::Machine, windows_path::MACHINE_KEY)] {
            if let Some((value, _)) = windows_path::read(root, key, "Path") {
                dirs.extend(windows_path::split(&windows_path::expand(&value)).into_iter().map(PathBuf::from));
            }
        }
        dirs
    }
    #[cfg(not(windows))]
    {
        let mut dirs: Vec<PathBuf> = std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
        // Apps opened from the Dock or Finder get a minimal PATH; terminals
        // also search these.
        for d in ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin"] {
            dirs.push(PathBuf::from(d));
        }
        dirs
    }
}

/// Whether any directory on the PATH holds a `porter`.
fn porter_on_path() -> bool {
    let name = if cfg!(windows) { "porter.exe" } else { "porter" };
    path_dirs().iter().any(|d| d.join(name).is_file())
}

/// The status the setting shows.
pub fn status() -> CliStatus {
    #[cfg(windows)]
    if crate::services::admin::package_family_name().is_some() {
        return CliStatus {
            bundled: bundled_cli().map(|p| p.display().to_string()),
            on_path: true,
            can_toggle: false,
            note: Some("The Store version adds porter for you.".into()),
        };
    }
    let bundled = bundled_cli();
    let shown = bundled.as_ref().map(|p| p.display().to_string());
    let Some(exe) = bundled else {
        return CliStatus {
            bundled: None,
            on_path: porter_on_path(),
            can_toggle: false,
            note: Some("This copy of Porter doesn't include the terminal version. Download porter-cli from the GitHub release.".into()),
        };
    };

    #[cfg(windows)]
    {
        let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
        if windows_path::contains(windows_path::Root::Machine, windows_path::MACHINE_KEY, "Path", &dir) {
            return CliStatus {
                bundled: shown,
                on_path: true,
                can_toggle: false,
                note: Some("The installer added it for all users. Uninstalling Porter removes it.".into()),
            };
        }
        let on = windows_path::contains(windows_path::Root::User, windows_path::USER_KEY, "Path", &dir);
        CliStatus { bundled: shown, on_path: on, can_toggle: true, note: None }
    }
    #[cfg(target_os = "macos")]
    {
        let linked = mac::link_target().is_some_and(|t| same_file(&t, &exe));
        if !linked && porter_on_path() {
            // Homebrew's cask links it, or porter-cli was installed by hand:
            // a link of ours would change nothing, and that one isn't ours.
            return CliStatus {
                bundled: shown,
                on_path: true,
                can_toggle: false,
                note: Some("porter is already on your PATH (Homebrew links it for you).".into()),
            };
        }
        CliStatus { bundled: shown, on_path: linked, can_toggle: true, note: None }
    }
    #[cfg(target_os = "linux")]
    {
        let note = if std::env::var_os("APPIMAGE").is_some() {
            Some("An AppImage can't add commands to the PATH. Download porter-cli from the GitHub release.".to_string())
        } else if crate::platform::flatpak::is_sandboxed() {
            Some("Run it with: flatpak run --command=porter com.triptoafsin.porter".to_string())
        } else {
            Some(format!("Installed at {}, which the package manager keeps up to date.", exe.display()))
        };
        CliStatus { bundled: shown, on_path: porter_on_path(), can_toggle: false, note }
    }
}

/// Put the bundled `porter` on the PATH (true) or take it off (false).
pub fn set_on_path(on: bool) -> anyhow::Result<CliStatus> {
    let exe = bundled_cli().ok_or_else(|| anyhow::anyhow!("This copy of Porter doesn't include the terminal version."))?;
    #[cfg(windows)]
    {
        let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
        if on {
            windows_path::add(&dir)?;
        } else {
            windows_path::remove(&dir)?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        if on {
            mac::link(&exe)?;
        } else {
            mac::unlink(&exe)?;
        }
    }
    #[cfg(target_os = "linux")]
    {
        let _ = (on, &exe);
        anyhow::bail!("On Linux the package manager decides where porter is installed.");
    }
    #[allow(unreachable_code)]
    Ok(status())
}

/// Put the bundled `porter` on the system PATH, for every user (true), or take
/// it off (false). Needs admin rights: the Windows installer, which runs
/// elevated, calls this through `porter path add --all-users`.
pub fn set_on_path_for_all_users(on: bool) -> anyhow::Result<CliStatus> {
    let exe = bundled_cli().ok_or_else(|| anyhow::anyhow!("This copy of Porter doesn't include the terminal version."))?;
    #[cfg(windows)]
    {
        let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
        let root = windows_path::Root::Machine;
        let changed = if on { windows_path::add_to(root, "Path", &dir)? } else { windows_path::remove_from(root, "Path", &dir)? };
        if changed {
            windows_path::broadcast();
        }
        return Ok(status());
    }
    #[cfg(not(windows))]
    {
        let _ = (on, exe);
        anyhow::bail!("--all-users is only for the Windows installer.");
    }
}

#[cfg(target_os = "macos")]
fn same_file(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn layout(name: &str, files: &[&str]) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("porter-cli-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        for f in files {
            let p = dir.join(f);
            std::fs::create_dir_all(p.parent().unwrap()).unwrap();
            std::fs::write(&p, f.as_bytes()).unwrap();
        }
        dir
    }

    #[test]
    fn the_installers_layout_finds_porter_beside_the_app() {
        let app = if cfg!(windows) { "porter-app.exe" } else { "porter-app" };
        let dir = layout("installer", &[app, CLI_NAME]);
        assert_eq!(find_cli(&dir.join(app)), Some(dir.join(CLI_NAME)));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn the_portable_and_store_layout_finds_porter_in_cli() {
        let app = if cfg!(windows) { "Porter.exe" } else { "Porter" };
        let cli = format!("cli/{CLI_NAME}");
        let dir = layout("portable", &[app, &cli]);
        // On a case-insensitive disk `porter.exe` beside `Porter.exe` is the
        // app itself, and must not be taken for the CLI.
        assert_eq!(find_cli(&dir.join(app)), Some(dir.join("cli").join(CLI_NAME)));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn the_cli_is_its_own_bundled_copy() {
        let dir = layout("self", &[CLI_NAME]);
        assert_eq!(find_cli(&dir.join(CLI_NAME)), Some(dir.join(CLI_NAME)));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn no_cli_means_none() {
        let app = if cfg!(windows) { "Porter.exe" } else { "Porter" };
        let dir = layout("none", &[app]);
        assert_eq!(find_cli(&dir.join(app)), None);
        let _ = std::fs::remove_dir_all(dir);
    }
}

#[cfg(target_os = "macos")]
mod mac {
    use std::path::{Path, PathBuf};
    use std::process::Command;

    pub const LINK: &str = "/usr/local/bin/porter";

    pub fn link_target() -> Option<PathBuf> {
        std::fs::read_link(LINK).ok()
    }

    fn admin_shell(script: &str) -> anyhow::Result<()> {
        let apple = format!("do shell script \"{}\" with administrator privileges", script.replace('\\', "\\\\").replace('"', "\\\""));
        let out = Command::new("osascript").args(["-e", &apple]).output()?;
        if out.status.success() {
            return Ok(());
        }
        let err = String::from_utf8_lossy(&out.stderr);
        if err.contains("-128") || err.contains("User canceled") {
            anyhow::bail!("Cancelled.");
        }
        anyhow::bail!("Couldn't change {LINK}: {}", err.trim())
    }

    fn quote(p: &Path) -> String {
        format!("'{}'", p.display().to_string().replace('\'', "'\\''"))
    }

    pub fn link(exe: &Path) -> anyhow::Result<()> {
        admin_shell(&format!("mkdir -p /usr/local/bin && ln -sf {} {LINK}", quote(exe)))
    }

    pub fn unlink(exe: &Path) -> anyhow::Result<()> {
        match link_target() {
            Some(t) if super::same_file(&t, exe) => admin_shell(&format!("rm -f {LINK}")),
            _ => Ok(()),
        }
    }
}

/// The user and system PATH in the registry. Values are read and written raw,
/// so `%USERPROFILE%`-style entries and the value's type (REG_EXPAND_SZ) are
/// kept, and there is no length limit (NSIS's own string functions truncate a
/// PATH longer than 1024 characters, which is why the installer calls this).
#[cfg(windows)]
pub mod windows_path {
    use std::path::Path;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::System::Environment::ExpandEnvironmentStringsW;
    use windows::Win32::System::Registry::*;
    use windows::Win32::UI::WindowsAndMessaging::{SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE};

    pub const USER_KEY: &str = "Environment";
    pub const MACHINE_KEY: &str = r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment";

    #[derive(Clone, Copy)]
    pub enum Root {
        User,
        Machine,
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    fn key_for(root: Root) -> &'static str {
        match root {
            Root::User => USER_KEY,
            Root::Machine => MACHINE_KEY,
        }
    }

    fn open(root: Root, key: &str, write: bool) -> Option<HKEY> {
        let hroot = match root {
            Root::User => HKEY_CURRENT_USER,
            Root::Machine => HKEY_LOCAL_MACHINE,
        };
        let access = if write { KEY_READ | KEY_SET_VALUE } else { KEY_READ };
        let mut h = HKEY::default();
        let k = wide(key);
        unsafe { RegOpenKeyExW(hroot, PCWSTR(k.as_ptr()), None, access, &mut h) }.ok().ok()?;
        Some(h)
    }

    /// The raw value and its type, or None if missing.
    pub fn read(root: Root, key: &str, name: &str) -> Option<(String, REG_VALUE_TYPE)> {
        let h = open(root, key, false)?;
        let n = wide(name);
        let mut kind = REG_VALUE_TYPE::default();
        let mut size = 0u32;
        let result = unsafe {
            RegQueryValueExW(h, PCWSTR(n.as_ptr()), None, Some(&mut kind), None, Some(&mut size))
        }
        .ok()
        .ok()
        .and_then(|_| {
            let mut buf = vec![0u16; (size as usize).div_ceil(2) + 1];
            let mut bytes = (buf.len() * 2) as u32;
            unsafe {
                RegQueryValueExW(h, PCWSTR(n.as_ptr()), None, Some(&mut kind), Some(buf.as_mut_ptr() as *mut u8), Some(&mut bytes))
            }
            .ok()
            .ok()?;
            buf.truncate((bytes as usize) / 2);
            while buf.last() == Some(&0) {
                buf.pop();
            }
            Some((String::from_utf16_lossy(&buf), kind))
        });
        unsafe {
            let _ = RegCloseKey(h);
        }
        result
    }

    fn write(root: Root, key: &str, name: &str, value: &str, kind: REG_VALUE_TYPE) -> anyhow::Result<()> {
        let h = open(root, key, true).ok_or_else(|| anyhow::anyhow!("Couldn't open the PATH in the registry."))?;
        let n = wide(name);
        let data = wide(value);
        let bytes = unsafe { std::slice::from_raw_parts(data.as_ptr() as *const u8, data.len() * 2) };
        let result = unsafe { RegSetValueExW(h, PCWSTR(n.as_ptr()), None, kind, Some(bytes)) };
        unsafe {
            let _ = RegCloseKey(h);
        }
        result.ok().map_err(|e| anyhow::anyhow!("Couldn't update the PATH: {e}"))
    }

    pub fn expand(value: &str) -> String {
        let src = wide(value);
        let needed = unsafe { ExpandEnvironmentStringsW(PCWSTR(src.as_ptr()), None) };
        if needed == 0 {
            return value.to_string();
        }
        let mut buf = vec![0u16; needed as usize];
        let n = unsafe { ExpandEnvironmentStringsW(PCWSTR(src.as_ptr()), Some(&mut buf)) };
        if n == 0 {
            return value.to_string();
        }
        buf.truncate((n as usize).saturating_sub(1));
        String::from_utf16_lossy(&buf)
    }

    pub fn split(value: &str) -> Vec<String> {
        value.split(';').map(str::trim).filter(|s| !s.is_empty()).map(str::to_string).collect()
    }

    /// Two PATH entries name the same folder: case and a trailing slash don't
    /// matter, and `%VARS%` are expanded.
    fn same_dir(entry: &str, dir: &Path) -> bool {
        let norm = |s: &str| s.trim().trim_end_matches(['\\', '/']).to_lowercase();
        norm(&expand(entry)) == norm(&dir.display().to_string())
    }

    pub fn contains(root: Root, key: &str, name: &str, dir: &Path) -> bool {
        read(root, key, name).is_some_and(|(v, _)| split(&v).iter().any(|e| same_dir(e, dir)))
    }

    /// Append `dir` to a PATH-like value, the user's or the system's. False if
    /// it was already there.
    pub fn add_to(root: Root, name: &str, dir: &Path) -> anyhow::Result<bool> {
        let key = key_for(root);
        let (value, kind) = read(root, key, name).unwrap_or((String::new(), REG_EXPAND_SZ));
        if split(&value).iter().any(|e| same_dir(e, dir)) {
            return Ok(false);
        }
        let mut entries = split(&value);
        entries.push(dir.display().to_string());
        let kind = if kind == REG_SZ || kind == REG_EXPAND_SZ { kind } else { REG_EXPAND_SZ };
        write(root, key, name, &entries.join(";"), kind)?;
        Ok(true)
    }

    /// Remove every entry naming `dir` from a PATH-like value, the user's or
    /// the system's. False if it wasn't there.
    pub fn remove_from(root: Root, name: &str, dir: &Path) -> anyhow::Result<bool> {
        let key = key_for(root);
        let Some((value, kind)) = read(root, key, name) else { return Ok(false) };
        let entries = split(&value);
        let kept: Vec<&String> = entries.iter().filter(|e| !same_dir(e, dir)).collect();
        if kept.len() == entries.len() {
            return Ok(false);
        }
        let joined = kept.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(";");
        write(root, key, name, &joined, kind)?;
        Ok(true)
    }

    /// Tell Explorer and other programs that the environment changed, so new
    /// terminals pick it up without signing out.
    pub fn broadcast() {
        let env = wide("Environment");
        unsafe {
            SendMessageTimeoutW(HWND_BROADCAST, WM_SETTINGCHANGE, WPARAM(0), LPARAM(env.as_ptr() as isize), SMTO_ABORTIFHUNG, 3000, None);
        }
    }

    pub fn add(dir: &Path) -> anyhow::Result<bool> {
        let changed = add_to(Root::User, "Path", dir)?;
        if changed {
            broadcast();
        }
        Ok(changed)
    }

    pub fn remove(dir: &Path) -> anyhow::Result<bool> {
        let changed = remove_from(Root::User, "Path", dir)?;
        if changed {
            broadcast();
        }
        Ok(changed)
    }

    pub fn delete_value(name: &str) {
        if let Some(h) = open(Root::User, USER_KEY, true) {
            let n = wide(name);
            unsafe {
                let _ = RegDeleteValueW(h, PCWSTR(n.as_ptr()));
                let _ = RegCloseKey(h);
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        /// Works on a scratch value beside PATH, never on PATH itself.
        #[test]
        fn add_and_remove_keep_the_other_entries_and_the_type() {
            let name = format!("PORTER_TEST_PATH_{}", std::process::id());
            let original = r"%USERPROFILE%\bin;C:\Tools;C:\Program Files\Thing\";
            write(Root::User, USER_KEY, &name, original, REG_EXPAND_SZ).unwrap();
            let dir = Path::new(r"C:\Program Files\Porter");

            assert!(add_to(Root::User, &name, dir).unwrap());
            assert!(!add_to(Root::User, &name, Path::new(r"c:\program files\porter\")).unwrap(), "same folder, other spelling");
            let (after, kind) = read(Root::User, USER_KEY, &name).unwrap();
            assert_eq!(kind, REG_EXPAND_SZ);
            assert!(after.starts_with(r"%USERPROFILE%\bin;"), "unexpanded entries survive: {after}");
            assert!(after.ends_with(r";C:\Program Files\Porter"));

            assert!(remove_from(Root::User, &name, dir).unwrap());
            assert!(!remove_from(Root::User, &name, dir).unwrap());
            let (back, _) = read(Root::User, USER_KEY, &name).unwrap();
            assert_eq!(back, r"%USERPROFILE%\bin;C:\Tools;C:\Program Files\Thing\");

            delete_value(&name);
            assert!(read(Root::User, USER_KEY, &name).is_none());
        }

        #[test]
        fn a_long_path_is_not_truncated() {
            let name = format!("PORTER_TEST_LONG_{}", std::process::id());
            let long: String = (0..120).map(|i| format!(r"C:\Some\Long\Folder\Number{i:03}")).collect::<Vec<_>>().join(";");
            assert!(long.len() > 3000);
            write(Root::User, USER_KEY, &name, &long, REG_EXPAND_SZ).unwrap();
            add_to(Root::User, &name, Path::new(r"C:\Porter")).unwrap();
            let (after, _) = read(Root::User, USER_KEY, &name).unwrap();
            assert_eq!(after, format!(r"{long};C:\Porter"));
            delete_value(&name);
        }
    }
}
