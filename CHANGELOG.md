# Changelog

All notable changes to Porter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
