# Changelog

All notable changes to Porter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- A portable version for Windows: a zip that runs without installing and keeps
  its settings in a `data` folder next to the exe while a `portable` file sits
  beside it.
- Porter runs in Docker. `docker compose up` starts it on a virtual display
  shown in the browser at `http://localhost:6080`. Sharing the host's process
  namespace, it reads the host's socket table, so it lists the host's
  listening ports (on Docker Desktop, your containers' published ports).

### Changed
- Releases are created once before the builds start, so parallel builds can no
  longer split a release into several drafts.

## [0.3.1] - 2026-10-03

### Added
- **Show outgoing connections** in settings, off by default. Turn it on to list
  the local port of every open connection as well as listening ports, as
  versions before 0.3.0 did.

### Fixed
- A fresh install pinned no ports, although settings listed five defaults. The
  defaults are now pinned until you change them.
- Search finds ports by the name of the process holding them, as well as by
  number. The search box used to accept digits only.
- On macOS, a connection was listed under its remote port instead of its local
  one.

## [0.3.0] - 2026-10-03

### Changed
- Much lighter on the machine. Idle CPU dropped from about 15% of a core to
  about 1.5%, and to nothing while minimised. Each refresh used to re-read
  every process on the system; it now reads only the processes that own a
  port, and only their names. The data sent to the window each refresh went
  from about 120 KB to about 6 KB.
- The port list shows listening ports only. It used to include the local end of
  every outgoing connection, which was most of the list and nothing you could
  free up.
- Refreshing pauses while the window is minimised and catches up on restore.

### Fixed
- Ports listening on IPv6 only (such as a dev server bound to `localhost` that
  resolved to `::1`) showed as free on Windows.
- On Linux, finding the process behind each port walked every open file of
  every process once per connection. It now does one pass per refresh, keeps
  listening sockets only, and reads IPv6 addresses correctly.

## [0.2.2] - 2026-10-02

### Added
- "Other ports" is now a sortable table: click Port, Service, Process or Status to sort, click again to reverse; the choice is remembered
- "By app" view groups other ports under the app using them (largest first, collapsed by default), similar to Task Manager
- The list holds still while your pointer is over it, so live refreshes no longer move rows while you scroll; a "Paused while you browse" note shows how many changes are waiting
- Toolbar and column headers stay pinned while scrolling the list

### Changed
- Other ports are always in a stable order instead of the order the system reports them in
- "Check now" in About spins while checking, then shows an up-to-date toast, an error toast, or opens the update dialog when a new version exists

## [0.2.1] - 2026-10-01

### Added
- Interface size setting (Compact 90%, Default 100%, Large 115%, Larger 130%) in the settings menu; scales text, icons and spacing and resizes the window to match, capped to the screen's usable area
- `Ctrl`/`Cmd` + `=` / `-` / `0` shortcuts to step through or reset the interface size

## [0.2.0] - 2026-10-01

### Changed
- Redesigned the interface: minimal near-black (`#0d0d0d`) dark theme, refined light theme, Geist + Geist Mono typography
- Frameless window with a custom title bar that hosts the app actions and window controls (native traffic lights kept on macOS)
- Stats merged into one overview panel with a proportional distribution bar and animated counters
- Status filter is now an inline segmented toggle instead of a dropdown
- Port list rebuilt as a single dense surface with hairline dividers, monospace port numbers, and a compact kill action
- Restyled dialogs, menus, toasts, admin notice, and pinned-port settings
- About dialog now reads the version from package.json

### Added
- Check for updates: Porter looks for a newer GitHub release on launch (and every six hours), shows an "Update" pill in the title bar with release notes and a download link, and has a manual "Check now" in the About dialog
- New app icon matching the redesigned mark
- Subtle motion: staggered list entrance, live-update pulse, theme crossfade, collapsible "Other ports"
- `/` to focus search, `Esc` to clear it
- Empty states for no pinned ports and no search results
- Skeleton loader for the first scan
- Respects `prefers-reduced-motion`

## [0.1.0] - 2025-10-05

### Added
- Real-time port monitoring with automatic refresh
- Customizable port list configuration via settings panel
- Show all running ports toggle
- Process management with confirmation dialog
- Admin privilege detection and one-click restart as admin
- Smart search and filtering by port number, process name, or status
- Dark/Light mode with system preference detection
- Port type icons for common services (web, database, server)
- Custom scrollbar using SimpleBar
- Stats cards showing free, occupied, and system ports
- About dialog with version info and project links
- Cross-platform support (Windows, macOS, Linux)

### Changed
- Improved color scheme with softer emerald/amber/blue palette
- Enhanced UI with sticky header and scrollable port list
- Better admin privilege handling with informative warnings

### Fixed
- Dropdown transparency in light mode
- Scrollbar visibility and spacing issues
- Window resize constraints (max width 700px)

## [0.0.1-alpha] - 2025-10-04

### Added
- Initial alpha release
- Basic port monitoring functionality
- Dark theme support

[Unreleased]: https://github.com/t21dev/porter-app/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/t21dev/porter-app/releases/tag/v0.1.0
[0.0.1-alpha]: https://github.com/t21dev/porter-app/releases/tag/v0.0.1-alpha
