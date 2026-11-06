import release from "./release.json";

export const SITE = {
  url: "https://porter.t21.dev",
  repo: "https://github.com/t21dev/porter-app",
  changelog: "https://github.com/t21dev/porter-app/blob/main/CHANGELOG.md",
  privacy: "https://github.com/t21dev/porter-app/blob/main/PRIVACY.md",
  license: "https://github.com/t21dev/porter-app/blob/main/LICENSE",
  docker: "https://github.com/t21dev/porter-app#run-in-docker",
};

export type Asset = { name: string; url: string; size: number };
type Assets = Partial<Record<
  "windows" | "windowsMsi" | "windowsPortable" | "macArm" | "macIntel" | "appimage" | "deb" | "rpm" | "flatpak" | "checksums",
  Asset
>>;
export const RELEASE = release as { version: string; date: string; page: string; assets: Assets };

/** Bytes to MB the way Windows Explorer shows it (MiB), one decimal. */
export const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
export const installerMB = RELEASE.assets.windows ? mb(RELEASE.assets.windows.size) : null;

export type Status = "free" | "occupied" | "system";
export type DemoPort = { port: number; service: string; process?: string; pid?: number; status: Status };

// The pinned list from the README screenshot (Windows, dark theme), so the demo shows real data.
export const DEMO: DemoPort[] = [
  { port: 3000, service: "React/Node", status: "free" },
  { port: 3001, service: "Next.js", status: "free" },
  { port: 5173, service: "Vite", status: "free" },
  { port: 5432, service: "PostgreSQL", process: "com.docker.backend.exe", pid: 44460, status: "occupied" },
  { port: 8001, service: "Unknown", process: "com.docker.backend.exe", pid: 44460, status: "occupied" },
  { port: 8080, service: "HTTP Alt", status: "free" },
  { port: 27017, service: "MongoDB", status: "free" },
];

// Watched by default (README, Configuration).
export const DEFAULT_PORTS: [string, string][] = [
  ["80, 443", "HTTP, HTTPS"],
  ["3000–3001", "React, Next.js"],
  ["3306", "MySQL"],
  ["4200", "Angular"],
  ["5000", "Flask"],
  ["5173", "Vite"],
  ["5432", "PostgreSQL"],
  ["6379", "Redis"],
  ["8000", "Django"],
  ["8080", "HTTP alternative"],
  ["9000", "PHP-FPM"],
  ["27017", "MongoDB"],
];

// Package managers. Flip `live` once a package installs for real; only live ones render.
export const PACKAGES: { name: string; os: string; live: boolean; commands: string[] }[] = [
  {
    name: "Scoop",
    os: "Windows",
    live: true,
    commands: ["scoop bucket add t21dev https://github.com/t21dev/scoop-bucket", "scoop install t21dev/porter"],
  },
  { name: "winget", os: "Windows", live: false, commands: ["winget install t21dev.Porter"] },
  { name: "Homebrew", os: "macOS", live: false, commands: ["brew install --cask t21dev/tap/porter"] },
];

export const FEATURES:{ title: string; body: string }[] = [
  {
    title: "Pin the ports you use",
    body: "Hover a row and click the pin to keep that port on top, running or not. Up to 50, saved automatically. Unpin with Undo.",
  },
  {
    title: "Search and filter",
    body: "Find a port by number or by the process holding it. Press / to search and Esc to clear. Toggle Free, Occupied and System.",
  },
  {
    title: "Stop what's in the way",
    body: "Click × on a port in use and confirm. Porter tells you when it needs admin rights, and restarts as admin in one click.",
  },
  {
    title: "Every port, when you need it",
    body: "Expand Other ports to see every listening port on the system, or turn on outgoing connections to list those too.",
  },
  {
    title: "Light and dark",
    body: "A near-black theme and a light one, with a smooth crossfade between them. Numbers in mono, so ports line up.",
  },
  {
    title: "Nothing leaves your machine",
    body: "Porter reads your port table locally. No account, no analytics, no telemetry. It only asks GitHub for new releases.",
  },
];
