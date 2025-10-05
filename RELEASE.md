# Porter v0.0.1-alpha Release Notes

## 🎉 First Alpha Release

We're excited to announce the first alpha release of Porter - a sleek, fast, and secure desktop port monitoring application!

## 📦 Downloads

### Windows
- **Installer (MSI)**: `Porter_0.0.1_x64_en-US.msi`
- **Setup (NSIS)**: `Porter_0.0.1_x64-setup.exe`
- **Portable**: `Porter_0.0.1_x64.exe`

All builds can be found in `src-tauri/target/release/bundle/`

## ✨ What's New

### Core Features
- ✅ **Real-time Port Monitoring** - Monitor ports with automatic refresh every 2 seconds
- ✅ **Customizable Port List** - Configure which ports to scan via settings panel
- ✅ **Show All Ports** - Toggle to view all running ports on the system
- ✅ **Process Management** - Kill processes occupying ports (admin required)
- ✅ **Smart Search & Filtering** - Search by port number or process name, filter by status
- ✅ **Dark/Light Mode** - Beautiful themes with smooth transitions
- ✅ **Admin Privilege Detection** - Clear warnings when admin rights are needed

### UI/UX Highlights
- 🎨 Modern, compact design built with shadcn/ui
- 🔍 Full-width search bar with 3/4 width layout
- 🏷️ Port type icons (web, database, server indicators)
- 📊 Stats cards showing free, occupied, and system ports
- ⚡ Loading animations during port scanning
- ⚙️ Settings panel for port configuration

### Technical Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v3
- **Backend**: Rust, Tauri 2.0
- **Platform Support**: Windows (macOS & Linux coming soon)

## 🚀 Getting Started

### Installation

1. Download the appropriate installer for your system
2. Run the installer and follow the prompts
3. Launch Porter from your applications menu

### Usage

1. **First Launch**
   - Porter will scan default common developer ports
   - If you need to kill processes, run as Administrator

2. **Customize Ports**
   - Click the settings icon (⚙️) in the header
   - Add/remove ports to scan at startup
   - Changes save automatically

3. **View All Ports**
   - Click "Show All" to view all running ports
   - Click "Show Common" to return to configured ports

4. **Search & Filter**
   - Use search bar to find specific ports
   - Use filter dropdown to toggle port statuses

## ⚠️ Known Limitations (Alpha)

- Process killing requires administrator privileges
- Windows-only for this alpha (macOS/Linux coming soon)
- No auto-start functionality yet
- No CLI interface yet

## 🔧 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 100MB minimum
- **Disk**: 50MB installation size

## 🐛 Bug Reports

Found a bug? Please report it on our [GitHub Issues](https://github.com/t21dev/porter-app/issues) page.

## 📝 License

Porter is open source software licensed under the MIT License.

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide](https://lucide.dev/) - Icons

---

**Full Changelog**: https://github.com/t21dev/porter-app/commits/v0.0.1-alpha

Made with ❤️ by the [t21.dev](https://t21.dev) team
