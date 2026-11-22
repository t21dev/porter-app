# Porter - Port Monitor

<div align="center">

<img src="./icon.png" alt="Porter Icon" width="128" height="128" />

![Porter](https://img.shields.io/badge/Porter-Port%20Monitor-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24c8db)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
[![Release](https://img.shields.io/github/v/release/t21dev/porter-app)](https://github.com/t21dev/porter-app/releases)

A sleek, fast, and secure desktop port monitoring application built with Tauri, React, and TypeScript.

**[Download Latest Release](https://github.com/t21dev/porter-app/releases)** | An Opensource Project of [t21.dev](https://t21.dev)

<a href="https://apps.microsoft.com/detail/9N1Q6KGF676M"><img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200" alt="Get it from Microsoft" /></a>

</div>

## 🚀 Features

- **Real-time Port Monitoring** - Monitor common developer ports and all system ports in real-time
- **Customizable Port List** - Configure which ports to scan at startup via settings
- **Process Management** - Kill processes occupying ports (requires admin privileges)
- **Smart Filtering** - Filter ports by status (Free, Occupied, System) and search by port number or process name
- **Show All Ports** - Toggle between common ports and all running ports
- **Outgoing Connections** - Optionally list the local port of every open connection too, not just listening ports (Settings, off by default)
- **Dark/Light Mode** - Minimal near-black and light themes with a smooth crossfade between them
- **Custom Title Bar** - Frameless window with integrated controls (native traffic lights on macOS)
- **Admin Privilege Detection** - Automatically detects and warns when running without admin rights
- **Why is this port open?** - Click any port to see what it's likely for, how far it reaches (this machine, your network, all interfaces) and what to do about it. The Exposed view lists only what other machines can reach, riskiest first
- **Docker and Podman** - Published ports show the container's name and image instead of `com.docker.backend`
- **Terminal version** - `porter` runs over SSH on a server: a live view, Docker and Podman containers by name, and an audit that explains why each port is open and whether it should be (see [In the terminal](#in-the-terminal-porter))
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Fast & Lightweight** - Built with Tauri for minimal resource usage

## 📸 Screenshots

<p align="center">
  <img src="./screenshot.png" alt="Porter in dark mode" width="49%" />
  <img src="./screenshot-light.png" alt="Porter in light mode" width="49%" />
</p>

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Lucide React** - Icons

### Backend
- **Rust** - System-level operations
- **Tauri 2.0** - Desktop framework
- **sysinfo** - Process monitoring
- **Platform-specific APIs**
  - Windows: IPHLPAPI
  - Linux: /proc filesystem
  - macOS: lsof

## 📦 Installation

### Microsoft Store (Windows)

**Windows:** the easiest way is the [Microsoft Store](https://apps.microsoft.com/detail/9N1Q6KGF676M). The Store build is signed, so SmartScreen doesn't warn, and the Store keeps it up to date.

<a href="https://apps.microsoft.com/detail/9N1Q6KGF676M"><img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200" alt="Get it from Microsoft" /></a>

```bash
# Or with winget (installs the Microsoft Store build)
winget install 9N1Q6KGF676M -s msstore
```

### Download Pre-built Release

For every other system, or to install without the Store, download the latest release for your platform from the [Releases page](https://github.com/t21dev/porter-app/releases).

| Platform | File |
|----------|------|
| Windows | `Porter_x.x.x_x64-setup.exe` or `.msi`, or `Porter_x.x.x_x64_portable.zip` to run without installing |
| macOS | `Porter_x.x.x_aarch64.dmg` (Apple Silicon) or `Porter_x.x.x_x64.dmg` (Intel) |
| Linux | `.deb`, `.AppImage`, or `Porter_x.x.x_x86_64.flatpak` |

### Package managers

```bash
# macOS (Apple silicon and Intel), Homebrew
brew install --cask t21dev/tap/porter-app

# Windows, Scoop
scoop bucket add t21dev https://github.com/t21dev/scoop-bucket
scoop install t21dev/porter
```

The cask clears the quarantine flag, so macOS opens Porter without the
"damaged" error below. Scoop installs the portable build and keeps its `data`
folder (settings and pinned ports) across updates. `brew upgrade` picks up a
new release within minutes of it, and `scoop update` within a few hours.

#### Flatpak (Linux)

```bash
flatpak install --user Porter_x.x.x_x86_64.flatpak
flatpak run com.triptoafsin.porter
```

The bundle fetches the GNOME runtime it needs from Flathub on first install.
A sandboxed app can't see or stop processes outside its sandbox, so the
Flatpak has permission to run commands on the host
(`--talk-name=org.freedesktop.Flatpak`): Porter uses it to run `ss`, `kill`
and `pkexec` there, and nothing else. The host needs `ss` (iproute2, present
on nearly every distribution), and `pkexec` for killing other users'
processes. The bundle doesn't update itself: Porter tells you when a new
release is out, and you install the new file the same way.

To build it yourself from a `.deb` made by `npm run tauri build`:

```bash
flatpak/build.sh src-tauri/target/release/bundle/deb/Porter_x.x.x_amd64.deb Porter.flatpak
```

#### Portable version (Windows)

Unzip `Porter_x.x.x_x64_portable.zip` anywhere, a USB stick included, and run
`Porter.exe`. Nothing is installed. The `portable` file next to it keeps your
settings and pinned ports in a `data` folder beside the exe, so deleting the
folder removes every trace. Delete the `portable` file to use the normal
per-user data folder instead. It needs the Microsoft Edge WebView2 Runtime,
which Windows 10 and 11 already have.

#### Windows SmartScreen

The builds are not code-signed yet, so on first run SmartScreen may show
"Windows protected your PC": click More info, then Run anyway. Each release
lists the SHA-256 checksum of every download in `SHA256SUMS.txt`, so you can
check what you installed.

#### macOS Installation Note

macOS may show an error saying **"Porter is damaged and can't be opened"**. This happens because the app is not notarized with Apple (requires a paid developer account).

**To fix this**, open Terminal and run:
```bash
xattr -cr /Applications/Porter.app
```
Then open the app normally. Alternatively, right-click the app and select "Open" instead of double-clicking.

---

### In the terminal (`porter`)

For a server you reach over SSH, `porter` is Porter without the window: one
file with no dependencies, about 2.5 MB. It shows what is listening on which
port, names the Docker or Podman container behind each published port, and
explains each port: what it's likely for, how far it reaches, and whether it
should be open.

```bash
# Linux x86_64 (use aarch64-unknown-linux-musl on ARM)
curl -fsSL https://github.com/t21dev/porter-app/releases/latest/download/porter-cli_x86_64-unknown-linux-musl.tar.gz | tar -xz
sudo install porter /usr/local/bin/
```

Every release has a `porter-cli_*` archive for Linux (x86_64 and ARM, static,
so any distribution), macOS (Apple silicon and Intel) and Windows.

```bash
sudo porter                    # live view: ↑↓ select, / filter, e reachable only, K stop, q quit
porter audit                   # every port reachable from the network: why it's open, what to do
porter audit --all             # the same, explaining the low-risk ones in full too
porter explain 6379            # everything Porter knows about one port
porter list --json             # for scripts
porter audit --fail-on high    # exit status 2 if anything risky is exposed: for cron or CI
porter kill 3000               # stop whatever holds port 3000
```

Run it with `sudo` (or as administrator) to see the owner of every port;
without it, ports owned by other users show `?`.

What the advice is based on:

- **Reach**, from the address a port listens on: this machine only
  (`127.0.0.1`, `::1`), the local network (a private address), a public
  address, or all interfaces (`0.0.0.0`, `::`).
- **What it is**, from the container image, the process name and the port
  number, in that order, matched against a list of well-known services
  (databases, admin dashboards, remote access, dev servers, mail, VPNs and
  more). A container's own port counts, so Postgres published on 15432 is
  still recognised.
- **Risk**: anything reachable from this machine only is fine. Databases,
  caches, open Docker APIs, Jupyter, RDP and VNC on all interfaces are high.
  Dashboards, dev servers and unknown programs are medium. A local-network
  address lowers the risk one step.
- **Docker and ufw**: on Linux, Docker publishes ports with its own iptables
  rules, which ufw and firewalld don't filter. Porter points this out and
  gives the `127.0.0.1:HOST:CONTAINER` form that keeps a port private.

Porter doesn't read firewall rules, so "all interfaces" means the program
accepts connections from any network, not that the internet can reach it. It
works offline and sends nothing anywhere.

It lists UDP too (DNS, WireGuard, SNMP, NTP and so on): a UDP socket that is
bound but not connected takes packets from anyone. Programs also keep UDP
sockets open on high ports for their own outgoing traffic; Porter marks those
as low risk rather than as unknown servers. `--tcp-only` leaves UDP out.

### Run in Docker

Porter also runs in a container, shown in your browser. On a server, the
terminal version above is lighter. It shares the host's
process namespace and reads the host's socket table, so it lists the listening
ports of the machine the container runs on. That makes it useful on a headless
Linux server, or for seeing which of your containers holds which port.

```bash
docker compose up -d --build
```

Then open <http://localhost:6080>. The view has no password, so the port is
published on `127.0.0.1` only; to reach it from another machine, use an SSH
tunnel (`ssh -L 6080:localhost:6080 your-server`).

- On a Linux host, Porter sees every listening port on the host and the process
  behind it, and can stop it.
- On Docker Desktop (Windows, macOS), the host is Docker's Linux VM, so Porter
  shows your containers' published ports (owned by `dockerd`) rather than the
  ports of Windows or macOS itself.
- Settings and pinned ports are kept in the `porter-data` volume.

---

### Building from Source

#### Prerequisites
- Node.js 18+
- Rust 1.70+
- npm or yarn

#### Development Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/porter-app.git
cd porter-app
```

2. Install dependencies
```bash
npm install
```

3. Run in development mode
```bash
npm run tauri:dev
```

### Building for Production

```bash
npm run tauri:build
```

The built application will be available in `src-tauri/target/release/bundle/`

## 🎮 Usage

### Running Porter

1. **Launch the application**
   - For full functionality, run as Administrator (Windows) or with sudo (Linux/macOS)

2. **View Ports**
   - Common developer ports are displayed automatically on startup
   - Green = Free, Amber = In use, Blue = System

3. **Search Ports**
   - Use the search bar to find a port by number or by the name of the process holding it (press `/` to focus it, `Esc` to clear)

4. **Filter by Status**
   - Toggle the Free, Occupied, and System chips next to the search bar

5. **Kill Processes**
   - Click the ✕ on any in-use port and confirm to terminate the process
   - Requires administrator privileges

6. **Pin Ports**
   - Hover any row and click the pin to keep that port at the top, running or not; click it again on a pinned row to unpin (with Undo)
   - Or use the settings icon in the title bar to type port numbers in
   - Up to 50 pinned ports, saved automatically

7. **Toggle Views**
   - Expand "Other ports" below your pinned list to see every listening port on the system
   - Turn on **Only show pinned ports** in settings to hide Other ports entirely for a shorter, cleaner view
   - Turn on **Show outgoing connections** in settings to also list the local port of every open connection

## 🔧 Configuration

Porter monitors the following common developer ports by default:

- **3000-3001** - React, Next.js
- **4200** - Angular
- **5000** - Flask
- **5173** - Vite
- **8000** - Django, HTTP servers
- **8080** - Alternative HTTP
- **9000** - PHP-FPM
- **80, 443** - HTTP/HTTPS
- **5432** - PostgreSQL
- **3306** - MySQL
- **6379** - Redis
- **27017** - MongoDB

You can customize the port list via the settings icon in the app header. Your custom configuration is saved in browser localStorage.

## 🏗️ Project Structure

```
porter-app/
├── src/                      # React frontend
│   ├── components/           # React components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript types
│   └── App.tsx              # Main app component
├── src-tauri/               # Tauri backend (also the Cargo workspace root)
│   ├── src/
│   │   └── commands/        # Tauri IPC commands
│   ├── crates/
│   │   ├── porter-core/     # Port scanning, containers, advice; no UI
│   │   │   └── src/
│   │   │       ├── models/      # Data models
│   │   │       ├── platform/    # Platform-specific code
│   │   │       ├── services/    # Scanning and stopping processes
│   │   │       ├── containers.rs # Docker and Podman published ports
│   │   │       └── advisor.rs   # Why a port is open, and whether it should be
│   │   └── porter-cli/      # `porter`, the terminal version
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── docs/                    # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Privacy

Porter reads your computer's port table locally and has no account, no
analytics and no telemetry. It connects to one other system: GitHub, to check
for a new release. The full policy is in [PRIVACY.md](PRIVACY.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📧 Support

For support, please open an issue on GitHub or contact us at support@t21.dev

---

<div align="center">

Made with ❤️ by the [t21.dev](https://t21.dev) team

</div>

## Support

This project is free and open source. If it saves you time, you can support [Team 21](https://t21.dev) on [Patreon](https://www.patreon.com/triptex). It pays for code signing, app store fees and servers. In Bangladesh? You can support in taka on [SupportKori](https://www.supportkori.com/triptex).
