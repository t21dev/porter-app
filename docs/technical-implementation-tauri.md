# Porter - Technical Implementation Documentation (Tauri)

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation (Rust)](#backend-implementation-rust)
6. [Port Monitoring System](#port-monitoring-system)
7. [Cross-Platform Implementation](#cross-platform-implementation)
8. [IPC (Inter-Process Communication)](#ipc-inter-process-communication)
9. [State Management](#state-management)
10. [Performance Optimization](#performance-optimization)
11. [Security Implementation](#security-implementation)
12. [Build & Distribution](#build--distribution)
13. [Testing Strategy](#testing-strategy)
14. [Development Setup](#development-setup)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PORTER APPLICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           FRONTEND (React + TypeScript)             │    │
│  │                                                      │    │
│  │  ├─── UI Components (React)                         │    │
│  │  ├─── State Management (Zustand)                    │    │
│  │  ├─── Data Fetching (React Query)                   │    │
│  │  └─── Styling (Tailwind CSS)                        │    │
│  │                                                      │    │
│  └──────────────────┬───────────────────────────────────┘    │
│                     │                                        │
│                     │  Tauri IPC (JSON)                      │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           BACKEND (Rust + Tauri)                      │   │
│  │                                                        │   │
│  │  ├─── Tauri Commands (API Layer)                      │   │
│  │  ├─── Port Monitor Service                            │   │
│  │  ├─── Process Manager                                 │   │
│  │  ├─── System Integration                              │   │
│  │  └─── Data Storage (SQLite)                           │   │
│  │                                                        │   │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │                                        │
│                     │  System Calls                          │
│                     │                                        │
│  ┌──────────────────▼─────────────────────────────────────┐ │
│  │              OPERATING SYSTEM                          │ │
│  │                                                         │ │
│  │  ├─── Windows (netstat, IPHLPAPI, WMI)                │ │
│  │  ├─── macOS (/proc, lsof, syscalls)                   │ │
│  │  └─── Linux (/proc/net/tcp, netlink)                  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Interaction → React Component → Invoke Tauri Command
                                            ↓
                                      Rust Handler
                                            ↓
                                   System API Call
                                            ↓
                                   Process Data (Rust)
                                            ↓
                                   Serialize to JSON
                                            ↓
                                   Return to Frontend
                                            ↓
                                   Update UI State
                                            ↓
                                   Re-render Component
```

---

## Technology Stack

### Frontend Stack

**Core Framework:**
- **React 18.3+** - UI framework with concurrent features
- **TypeScript 5.3+** - Type-safe development
- **Vite 5.0+** - Build tool and dev server

**State Management:**
- **Zustand 4.5+** - Lightweight state management
- **TanStack Query (React Query) 5.0+** - Server state & caching

**UI & Styling:**
- **Tailwind CSS 3.4+** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

**Data Visualization:**
- **Recharts 2.10+** - Chart library for timeline views
- **React Virtual** - Virtualization for large lists

**Utilities:**
- **date-fns** - Date formatting and manipulation
- **zod** - Runtime type validation
- **clsx** - Conditional className utility

### Backend Stack

**Core Runtime:**
- **Tauri 2.0+** - Desktop application framework
- **Rust 1.75+** - Systems programming language

**System Monitoring:**
- **sysinfo 0.30+** - Cross-platform system information
- **tokio 1.35+** - Async runtime
- **netstat2 0.9+** - Network statistics

**Data & Storage:**
- **serde 1.0+** - Serialization framework
- **serde_json 1.0+** - JSON support
- **rusqlite 0.31+** - SQLite database
- **chrono 0.4+** - Date and time library

**Platform-Specific:**
- **windows** (Windows) - Windows API bindings
- **libc** (Unix) - C library bindings
- **mach** (macOS) - macOS-specific APIs

---

## Project Structure

```
porter-app/
│
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── ui/                   # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── DashboardView.tsx
│   │   │   ├── PortGrid.tsx
│   │   │   ├── ProcessList.tsx
│   │   │   └── QuickStats.tsx
│   │   ├── monitoring/           # Monitoring components
│   │   │   ├── RealTimeMonitor.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── ActivityLog.tsx
│   │   ├── favorites/            # Favorites components
│   │   │   ├── ProfileList.tsx
│   │   │   ├── PortProfile.tsx
│   │   │   └── ProfileEditor.tsx
│   │   ├── settings/             # Settings components
│   │   │   └── SettingsPanel.tsx
│   │   └── shared/               # Shared components
│   │       ├── SearchBar.tsx
│   │       ├── PortDetailModal.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── StatusBadge.tsx
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── tauri.ts              # Tauri command wrappers
│   │   ├── utils.ts              # Helper functions
│   │   └── constants.ts          # App constants
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── usePortMonitor.ts     # Port monitoring hook
│   │   ├── useProcessList.ts     # Process list hook
│   │   ├── useFavorites.ts       # Favorites management
│   │   └── useSettings.ts        # Settings hook
│   │
│   ├── store/                    # State management
│   │   ├── portStore.ts          # Port data store
│   │   ├── settingsStore.ts      # Settings store
│   │   └── uiStore.ts            # UI state store
│   │
│   ├── types/                    # TypeScript types
│   │   ├── port.ts               # Port-related types
│   │   ├── process.ts            # Process-related types
│   │   └── api.ts                # API response types
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Application entry
│   │   ├── lib.rs                # Library root
│   │   │
│   │   ├── commands/             # Tauri commands (IPC handlers)
│   │   │   ├── mod.rs
│   │   │   ├── port_commands.rs  # Port-related commands
│   │   │   ├── process_commands.rs # Process management
│   │   │   ├── settings_commands.rs # Settings
│   │   │   └── system_commands.rs # System info
│   │   │
│   │   ├── services/             # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── port_monitor.rs   # Port monitoring service
│   │   │   ├── process_manager.rs # Process management
│   │   │   ├── network_scanner.rs # Network scanning
│   │   │   └── data_store.rs     # Data persistence
│   │   │
│   │   ├── models/               # Data models
│   │   │   ├── mod.rs
│   │   │   ├── port.rs           # Port model
│   │   │   ├── process.rs        # Process model
│   │   │   └── config.rs         # Config model
│   │   │
│   │   ├── platform/             # Platform-specific code
│   │   │   ├── mod.rs
│   │   │   ├── windows.rs        # Windows implementation
│   │   │   ├── macos.rs          # macOS implementation
│   │   │   └── linux.rs          # Linux implementation
│   │   │
│   │   └── utils/                # Utilities
│   │       ├── mod.rs
│   │       ├── logger.rs         # Logging utilities
│   │       └── error.rs          # Error handling
│   │
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   └── build.rs                  # Build script
│
├── public/                       # Static assets
│   └── icons/                    # App icons
│
├── tests/                        # Tests
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
│
├── docs/                         # Documentation
│   ├── init-r-n-d.md
│   ├── user-flow-and-ux.md
│   └── technical-implementation-tauri.md
│
├── package.json                  # Node dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── vite.config.ts                # Vite config
└── README.md                     # Project readme
```

---

## Frontend Implementation

### 1. Project Setup

**package.json dependencies:**

```json
{
  "name": "porter-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.1.0",
    "zod": "^3.22.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-switch": "^1.0.3",
    "class-variance-authority": "^0.7.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

### 2. Tauri IPC Integration

**src/lib/tauri.ts:**

```typescript
import { invoke } from '@tauri-apps/api/core';
import { Port, Process, PortProfile, SystemInfo } from '@/types/api';

// Port monitoring commands
export async function getActivePorts(): Promise<Port[]> {
  return await invoke<Port[]>('get_active_ports');
}

export async function getPortDetails(port: number): Promise<Port | null> {
  return await invoke<Port | null>('get_port_details', { port });
}

export async function scanPortRange(start: number, end: number): Promise<Port[]> {
  return await invoke<Port[]>('scan_port_range', { start, end });
}

// Process management commands
export async function getProcessList(): Promise<Process[]> {
  return await invoke<Process[]>('get_process_list');
}

export async function killProcess(pid: number): Promise<boolean> {
  return await invoke<boolean>('kill_process', { pid });
}

export async function killProcessByPort(port: number): Promise<boolean> {
  return await invoke<boolean>('kill_process_by_port', { port });
}

// Favorites/Profile commands
export async function saveProfile(profile: PortProfile): Promise<void> {
  await invoke('save_profile', { profile });
}

export async function loadProfiles(): Promise<PortProfile[]> {
  return await invoke<PortProfile[]>('load_profiles');
}

export async function deleteProfile(id: string): Promise<void> {
  await invoke('delete_profile', { id });
}

// System commands
export async function getSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>('get_system_info');
}

export async function requestElevatedPrivileges(): Promise<boolean> {
  return await invoke<boolean>('request_elevated_privileges');
}
```

### 3. TypeScript Types

**src/types/api.ts:**

```typescript
export type PortStatus = 'free' | 'occupied' | 'system';
export type Protocol = 'TCP' | 'UDP';

export interface Port {
  port: number;
  status: PortStatus;
  protocol: Protocol;
  process?: Process;
  ip_address: string;
  created_at?: string;
}

export interface Process {
  pid: number;
  name: string;
  path: string;
  command: string;
  working_dir?: string;
  cpu_usage: number;
  memory_usage: number; // bytes
  threads: number;
  started_at: string;
  user?: string;
}

export interface NetworkActivity {
  bytes_sent: number;
  bytes_received: number;
  connections: number;
}

export interface PortProfile {
  id: string;
  name: string;
  description?: string;
  ports: {
    port: number;
    label: string;
    notes?: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface SystemInfo {
  os: string;
  os_version: string;
  hostname: string;
  cpu_count: number;
  total_memory: number;
  available_memory: number;
}

export interface PortActivity {
  port: number;
  timestamp: string;
  event: 'opened' | 'closed' | 'changed';
  details: string;
}
```

### 4. State Management with Zustand

**src/store/portStore.ts:**

```typescript
import { create } from 'zustand';
import { Port, Process } from '@/types/api';

interface PortStore {
  ports: Port[];
  selectedPort: Port | null;
  isLoading: boolean;
  error: string | null;

  setPorts: (ports: Port[]) => void;
  selectPort: (port: Port | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePort: (port: Port) => void;
  removePort: (portNumber: number) => void;
}

export const usePortStore = create<PortStore>((set) => ({
  ports: [],
  selectedPort: null,
  isLoading: false,
  error: null,

  setPorts: (ports) => set({ ports }),
  selectPort: (port) => set({ selectedPort: port }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  updatePort: (port) => set((state) => ({
    ports: state.ports.map((p) => p.port === port.port ? port : p)
  })),

  removePort: (portNumber) => set((state) => ({
    ports: state.ports.filter((p) => p.port !== portNumber)
  })),
}));
```

**src/store/settingsStore.ts:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  launchAtStartup: boolean;
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  refreshInterval: number; // milliseconds
  monitorPortRange: [number, number];
  showProcessDetails: boolean;
  notifications: {
    portConflict: boolean;
    processTerminated: boolean;
    systemNotifications: boolean;
  };
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'auto',
  launchAtStartup: false,
  minimizeToTray: true,
  showSystemTrayIcon: true,
  refreshInterval: 2000,
  monitorPortRange: [1024, 65535],
  showProcessDetails: true,
  notifications: {
    portConflict: true,
    processTerminated: true,
    systemNotifications: true,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'porter-settings',
    }
  )
);
```

### 5. Custom Hooks

**src/hooks/usePortMonitor.ts:**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getActivePorts } from '@/lib/tauri';
import { useSettingsStore } from '@/store/settingsStore';
import { Port } from '@/types/api';

export function usePortMonitor() {
  const queryClient = useQueryClient();
  const { settings } = useSettingsStore();

  const { data: ports = [], isLoading, error } = useQuery({
    queryKey: ['ports'],
    queryFn: getActivePorts,
    refetchInterval: settings.refreshInterval,
    refetchIntervalInBackground: true,
  });

  // Invalidate cache when settings change
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['ports'] });
  }, [settings.monitorPortRange, queryClient]);

  const refreshPorts = () => {
    queryClient.invalidateQueries({ queryKey: ['ports'] });
  };

  return { ports, isLoading, error, refreshPorts };
}
```

**src/hooks/useProcessList.ts:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { getProcessList } from '@/lib/tauri';

export function useProcessList() {
  const { data: processes = [], isLoading, error } = useQuery({
    queryKey: ['processes'],
    queryFn: getProcessList,
    refetchInterval: 3000,
  });

  return { processes, isLoading, error };
}
```

### 6. Key Components

**src/components/dashboard/PortGrid.tsx:**

```typescript
import { Port } from '@/types/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

interface PortGridProps {
  ports: Port[];
  onPortClick: (port: Port) => void;
}

export function PortGrid({ ports, onPortClick }: PortGridProps) {
  const commonPorts = [3000, 8080, 5173, 4200, 3001, 8000, 5000, 9000];

  const getPortInfo = (portNumber: number): Port | undefined => {
    return ports.find(p => p.port === portNumber);
  };

  return (
    <div className="grid grid-cols-8 gap-4">
      {commonPorts.map((portNumber) => {
        const port = getPortInfo(portNumber);
        const status = port?.status || 'free';

        return (
          <Card
            key={portNumber}
            className={cn(
              'p-4 cursor-pointer hover:shadow-md transition-shadow',
              'flex flex-col items-center justify-center'
            )}
            onClick={() => port && onPortClick(port)}
          >
            <div className="text-2xl font-bold mb-2">{portNumber}</div>
            <StatusBadge status={status} />
            {port?.process && (
              <div className="text-xs text-muted-foreground mt-2">
                {port.process.name}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

**src/components/dashboard/ProcessList.tsx:**

```typescript
import { Process } from '@/types/api';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProcessListProps {
  processes: Process[];
  onKillProcess: (pid: number) => void;
}

export function ProcessList({ processes, onKillProcess }: ProcessListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Port</TableHead>
          <TableHead>Process Name</TableHead>
          <TableHead>PID</TableHead>
          <TableHead>Protocol</TableHead>
          <TableHead>CPU</TableHead>
          <TableHead>Memory</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {processes.map((process) => (
          <TableRow key={process.pid}>
            <TableCell className="font-mono">{process.port}</TableCell>
            <TableCell>
              <div className="font-medium">{process.name}</div>
              <div className="text-xs text-muted-foreground">
                {process.path}
              </div>
            </TableCell>
            <TableCell className="font-mono">{process.pid}</TableCell>
            <TableCell>{process.protocol}</TableCell>
            <TableCell>{process.cpu_usage.toFixed(1)}%</TableCell>
            <TableCell>{formatBytes(process.memory_usage)}</TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onKillProcess(process.pid)}
              >
                Kill
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Backend Implementation (Rust)

### 1. Cargo.toml Dependencies

```toml
[package]
name = "porter-app"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.35", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
thiserror = "1.0"

# System monitoring
sysinfo = "0.30"
netstat2 = "0.9"

# Data storage
rusqlite = { version = "0.31", features = ["bundled"] }

# Platform-specific
[target.'cfg(windows)'.dependencies]
windows = { version = "0.52", features = [
  "Win32_Foundation",
  "Win32_NetworkManagement_IpHelper",
  "Win32_System_Threading",
  "Win32_System_ProcessStatus",
] }

[target.'cfg(target_os = "macos")'.dependencies]
libc = "0.2"
mach = "0.3"

[target.'cfg(target_os = "linux")'.dependencies]
libc = "0.2"
procfs = "0.15"
```

### 2. Main Entry Point

**src-tauri/src/main.rs:**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod platform;
mod services;
mod utils;

use commands::*;

fn main() {
    // Initialize logger
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Port commands
            get_active_ports,
            get_port_details,
            scan_port_range,

            // Process commands
            get_process_list,
            kill_process,
            kill_process_by_port,

            // Profile commands
            save_profile,
            load_profiles,
            delete_profile,

            // System commands
            get_system_info,
            request_elevated_privileges,
        ])
        .setup(|app| {
            // Initialize database
            services::data_store::init_database()?;

            // Setup system tray
            setup_system_tray(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_system_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // System tray implementation
    // Will be added in later implementation
    Ok(())
}
```

### 3. Data Models

**src-tauri/src/models/port.rs:**

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortStatus {
    Free,
    Occupied,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Port {
    pub port: u16,
    pub status: PortStatus,
    pub protocol: Protocol,
    pub process: Option<Process>,
    pub ip_address: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Process {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub command: String,
    pub working_dir: Option<String>,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub threads: u32,
    pub started_at: DateTime<Utc>,
    pub user: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortProfile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub ports: Vec<PortEntry>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortEntry {
    pub port: u16,
    pub label: String,
    pub notes: Option<String>,
}
```

**src-tauri/src/models/error.rs:**

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PorterError {
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Process not found: PID {0}")]
    ProcessNotFound(u32),

    #[error("Port {0} is not in use")]
    PortNotInUse(u16),

    #[error("Failed to kill process: {0}")]
    KillProcessFailed(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("System error: {0}")]
    SystemError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, PorterError>;
```

### 4. Port Monitoring Service

**src-tauri/src/services/port_monitor.rs:**

```rust
use crate::models::{Port, PortStatus, Process, Protocol};
use crate::platform;
use crate::utils::error::Result;
use sysinfo::{ProcessExt, System, SystemExt};
use std::collections::HashMap;

pub struct PortMonitor {
    system: System,
}

impl PortMonitor {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    /// Get all active ports (listening or established)
    pub fn get_active_ports(&mut self) -> Result<Vec<Port>> {
        self.system.refresh_all();

        // Use platform-specific implementation
        let port_info = platform::get_network_connections()?;

        let mut ports: HashMap<u16, Port> = HashMap::new();

        for conn in port_info {
            if let Some(existing) = ports.get(&conn.local_port) {
                // Skip if already added
                continue;
            }

            let process = if conn.pid > 0 {
                self.get_process_info(conn.pid)
            } else {
                None
            };

            let status = if process.is_some() {
                // Check if it's a system process
                if self.is_system_process(conn.pid) {
                    PortStatus::System
                } else {
                    PortStatus::Occupied
                }
            } else {
                PortStatus::Free
            };

            ports.insert(conn.local_port, Port {
                port: conn.local_port,
                status,
                protocol: conn.protocol,
                process,
                ip_address: conn.local_address,
                created_at: Some(chrono::Utc::now()),
            });
        }

        Ok(ports.into_values().collect())
    }

    /// Get detailed information about a specific port
    pub fn get_port_details(&mut self, port: u16) -> Result<Option<Port>> {
        let ports = self.get_active_ports()?;
        Ok(ports.into_iter().find(|p| p.port == port))
    }

    /// Scan a range of ports
    pub async fn scan_port_range(&mut self, start: u16, end: u16) -> Result<Vec<Port>> {
        let mut ports = Vec::new();

        for port in start..=end {
            if let Some(port_info) = self.get_port_details(port)? {
                ports.push(port_info);
            }
        }

        Ok(ports)
    }

    /// Get process information by PID
    fn get_process_info(&self, pid: u32) -> Option<Process> {
        let process = self.system.process(sysinfo::Pid::from(pid as usize))?;

        Some(Process {
            pid,
            name: process.name().to_string(),
            path: process.exe().to_string_lossy().to_string(),
            command: process.cmd().join(" "),
            working_dir: process.cwd().map(|p| p.to_string_lossy().to_string()),
            cpu_usage: process.cpu_usage(),
            memory_usage: process.memory(),
            threads: process.tasks.as_ref().map(|t| t.len() as u32).unwrap_or(0),
            started_at: chrono::DateTime::from_timestamp(
                process.start_time() as i64,
                0
            ).unwrap_or_else(|| chrono::Utc::now()),
            user: process.user_id().map(|uid| uid.to_string()),
        })
    }

    /// Check if a process is a system process
    fn is_system_process(&self, pid: u32) -> bool {
        // Platform-specific implementation
        platform::is_system_process(pid)
    }
}
```

### 5. Process Manager

**src-tauri/src/services/process_manager.rs:**

```rust
use crate::models::error::{PorterError, Result};
use crate::platform;
use sysinfo::{Pid, ProcessExt, Signal, System, SystemExt};

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

        let pid = Pid::from(pid as usize);

        if let Some(process) = self.system.process(pid) {
            // Try graceful termination first
            if process.kill_with(Signal::Term).is_some() {
                std::thread::sleep(std::time::Duration::from_millis(500));

                // Check if still running
                self.system.refresh_processes();
                if self.system.process(pid).is_none() {
                    return Ok(true);
                }

                // Force kill if still running
                if let Some(process) = self.system.process(pid) {
                    process.kill();
                }

                return Ok(true);
            }
        }

        Err(PorterError::ProcessNotFound(pid.as_u32() as u32))
    }

    /// Kill process by port number
    pub fn kill_process_by_port(&mut self, port: u16) -> Result<bool> {
        let connections = platform::get_network_connections()?;

        for conn in connections {
            if conn.local_port == port && conn.pid > 0 {
                return self.kill_process(conn.pid);
            }
        }

        Err(PorterError::PortNotInUse(port))
    }

    /// Get list of all processes
    pub fn get_process_list(&mut self) -> Vec<crate::models::Process> {
        self.system.refresh_all();

        self.system
            .processes()
            .iter()
            .map(|(pid, process)| crate::models::Process {
                pid: pid.as_u32() as u32,
                name: process.name().to_string(),
                path: process.exe().to_string_lossy().to_string(),
                command: process.cmd().join(" "),
                working_dir: process.cwd().map(|p| p.to_string_lossy().to_string()),
                cpu_usage: process.cpu_usage(),
                memory_usage: process.memory(),
                threads: process.tasks.as_ref().map(|t| t.len() as u32).unwrap_or(0),
                started_at: chrono::DateTime::from_timestamp(
                    process.start_time() as i64,
                    0
                ).unwrap_or_else(|| chrono::Utc::now()),
                user: process.user_id().map(|uid| uid.to_string()),
            })
            .collect()
    }
}
```

---

## Port Monitoring System

### Platform-Specific Implementation

**src-tauri/src/platform/mod.rs:**

```rust
#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::*;

use crate::models::Protocol;

#[derive(Debug, Clone)]
pub struct NetworkConnection {
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub protocol: Protocol,
    pub pid: u32,
    pub state: String,
}
```

**src-tauri/src/platform/windows.rs:**

```rust
use super::{NetworkConnection, Protocol};
use crate::utils::error::Result;
use windows::Win32::NetworkManagement::IpHelper::*;
use windows::Win32::Networking::WinSock::*;
use std::mem;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    // Get TCP connections
    connections.extend(get_tcp_connections()?);

    // Get UDP connections
    connections.extend(get_udp_connections()?);

    Ok(connections)
}

fn get_tcp_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();
    let mut size: u32 = 0;

    unsafe {
        // Get required buffer size
        let result = GetExtendedTcpTable(
            std::ptr::null_mut(),
            &mut size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if size == 0 {
            return Ok(connections);
        }

        // Allocate buffer
        let mut buffer = vec![0u8; size as usize];

        // Get TCP table
        let result = GetExtendedTcpTable(
            buffer.as_mut_ptr() as *mut _,
            &mut size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );

        if result.is_ok() {
            let table = &*(buffer.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
            let entries = std::slice::from_raw_parts(
                &table.table[0],
                table.dwNumEntries as usize,
            );

            for entry in entries {
                let local_addr = format!(
                    "{}.{}.{}.{}",
                    entry.dwLocalAddr & 0xFF,
                    (entry.dwLocalAddr >> 8) & 0xFF,
                    (entry.dwLocalAddr >> 16) & 0xFF,
                    (entry.dwLocalAddr >> 24) & 0xFF,
                );

                let local_port = u16::from_be(entry.dwLocalPort as u16);

                connections.push(NetworkConnection {
                    local_address: local_addr,
                    local_port,
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol: Protocol::TCP,
                    pid: entry.dwOwningPid,
                    state: format_tcp_state(entry.dwState),
                });
            }
        }
    }

    Ok(connections)
}

fn get_udp_connections() -> Result<Vec<NetworkConnection>> {
    // Similar implementation for UDP
    // Using GetExtendedUdpTable
    Ok(Vec::new())
}

fn format_tcp_state(state: u32) -> String {
    match state {
        1 => "CLOSED",
        2 => "LISTEN",
        3 => "SYN_SENT",
        4 => "SYN_RCVD",
        5 => "ESTABLISHED",
        6 => "FIN_WAIT1",
        7 => "FIN_WAIT2",
        8 => "CLOSE_WAIT",
        9 => "CLOSING",
        10 => "LAST_ACK",
        11 => "TIME_WAIT",
        12 => "DELETE_TCB",
        _ => "UNKNOWN",
    }
    .to_string()
}

pub fn is_system_process(pid: u32) -> bool {
    // Windows system processes typically have PID < 1000
    pid < 1000
}
```

**src-tauri/src/platform/linux.rs:**

```rust
use super::{NetworkConnection, Protocol};
use crate::utils::error::Result;
use std::fs;
use std::path::Path;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    // Read TCP connections from /proc/net/tcp
    if let Ok(tcp_conns) = parse_proc_net_tcp("/proc/net/tcp") {
        connections.extend(tcp_conns);
    }

    // Read TCP6 connections
    if let Ok(tcp6_conns) = parse_proc_net_tcp("/proc/net/tcp6") {
        connections.extend(tcp6_conns);
    }

    // Read UDP connections
    if let Ok(udp_conns) = parse_proc_net_udp("/proc/net/udp") {
        connections.extend(udp_conns);
    }

    Ok(connections)
}

fn parse_proc_net_tcp(path: &str) -> Result<Vec<NetworkConnection>> {
    let content = fs::read_to_string(path)?;
    let mut connections = Vec::new();

    for line in content.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() < 10 {
            continue;
        }

        // Parse local address and port
        let local_parts: Vec<&str> = parts[1].split(':').collect();
        if local_parts.len() != 2 {
            continue;
        }

        let local_port = u16::from_str_radix(local_parts[1], 16).unwrap_or(0);
        let local_addr = parse_hex_address(local_parts[0]);

        // Parse PID from inode
        let inode = parts[9].parse::<u64>().unwrap_or(0);
        let pid = find_pid_by_inode(inode).unwrap_or(0);

        connections.push(NetworkConnection {
            local_address: local_addr,
            local_port,
            remote_address: String::new(),
            remote_port: 0,
            protocol: Protocol::TCP,
            pid,
            state: "ESTABLISHED".to_string(),
        });
    }

    Ok(connections)
}

fn parse_proc_net_udp(path: &str) -> Result<Vec<NetworkConnection>> {
    // Similar to TCP parsing
    Ok(Vec::new())
}

fn parse_hex_address(hex: &str) -> String {
    let addr = u32::from_str_radix(hex, 16).unwrap_or(0);
    format!(
        "{}.{}.{}.{}",
        addr & 0xFF,
        (addr >> 8) & 0xFF,
        (addr >> 16) & 0xFF,
        (addr >> 24) & 0xFF
    )
}

fn find_pid_by_inode(inode: u64) -> Option<u32> {
    // Search /proc/[pid]/fd/ for socket inode
    let proc_path = Path::new("/proc");

    if let Ok(entries) = fs::read_dir(proc_path) {
        for entry in entries.flatten() {
            if let Ok(pid) = entry.file_name().to_string_lossy().parse::<u32>() {
                let fd_path = entry.path().join("fd");

                if let Ok(fd_entries) = fs::read_dir(fd_path) {
                    for fd_entry in fd_entries.flatten() {
                        if let Ok(link) = fs::read_link(fd_entry.path()) {
                            let link_str = link.to_string_lossy();
                            if link_str.contains(&format!("socket:[{}]", inode)) {
                                return Some(pid);
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

pub fn is_system_process(pid: u32) -> bool {
    // Linux system processes typically have PID < 1000
    pid < 1000
}
```

**src-tauri/src/platform/macos.rs:**

```rust
use super::{NetworkConnection, Protocol};
use crate::utils::error::Result;
use std::process::Command;

pub fn get_network_connections() -> Result<Vec<NetworkConnection>> {
    let mut connections = Vec::new();

    // Use lsof command to get network connections
    let output = Command::new("lsof")
        .args(&["-i", "-P", "-n"])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() < 9 {
            continue;
        }

        let name_field = parts[8];

        // Parse address:port
        if let Some((addr, port_str)) = name_field.rsplit_once(':') {
            if let Ok(port) = port_str.parse::<u16>() {
                let pid = parts[1].parse::<u32>().unwrap_or(0);

                let protocol = if parts[7].contains("TCP") {
                    Protocol::TCP
                } else {
                    Protocol::UDP
                };

                connections.push(NetworkConnection {
                    local_address: addr.to_string(),
                    local_port: port,
                    remote_address: String::new(),
                    remote_port: 0,
                    protocol,
                    pid,
                    state: parts.get(9).unwrap_or(&"").to_string(),
                });
            }
        }
    }

    Ok(connections)
}

pub fn is_system_process(pid: u32) -> bool {
    // macOS system processes typically have PID < 500
    pid < 500
}
```

---

## IPC (Inter-Process Communication)

### Tauri Commands

**src-tauri/src/commands/port_commands.rs:**

```rust
use crate::models::Port;
use crate::services::port_monitor::PortMonitor;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub port_monitor: Mutex<PortMonitor>,
}

#[tauri::command]
pub async fn get_active_ports(
    state: State<'_, AppState>
) -> Result<Vec<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    monitor.get_active_ports()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_port_details(
    port: u16,
    state: State<'_, AppState>
) -> Result<Option<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    monitor.get_port_details(port)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan_port_range(
    start: u16,
    end: u16,
    state: State<'_, AppState>
) -> Result<Vec<Port>, String> {
    let mut monitor = state.port_monitor.lock().unwrap();
    monitor.scan_port_range(start, end).await
        .map_err(|e| e.to_string())
}
```

**src-tauri/src/commands/process_commands.rs:**

```rust
use crate::models::Process;
use crate::services::process_manager::ProcessManager;
use std::sync::Mutex;
use tauri::State;

pub struct ProcessState {
    pub process_manager: Mutex<ProcessManager>,
}

#[tauri::command]
pub async fn get_process_list(
    state: State<'_, ProcessState>
) -> Result<Vec<Process>, String> {
    let mut manager = state.process_manager.lock().unwrap();
    Ok(manager.get_process_list())
}

#[tauri::command]
pub async fn kill_process(
    pid: u32,
    state: State<'_, ProcessState>
) -> Result<bool, String> {
    let mut manager = state.process_manager.lock().unwrap();
    manager.kill_process(pid)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn kill_process_by_port(
    port: u16,
    state: State<'_, ProcessState>
) -> Result<bool, String> {
    let mut manager = state.process_manager.lock().unwrap();
    manager.kill_process_by_port(port)
        .map_err(|e| e.to_string())
}
```

---

## Cross-Platform Implementation

### Build Configuration

**src-tauri/tauri.conf.json:**

```json
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Porter",
  "version": "0.1.0",
  "identifier": "com.porter.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Porter - Port Monitor",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "skipTaskbar": false,
        "theme": "Light"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    },
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true,
      "menuOnLeftClick": false
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "deb", "dmg", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "externalBin": [],
    "copyright": "Copyright © 2025 Porter",
    "category": "DeveloperTool",
    "shortDescription": "Port monitoring tool for developers",
    "longDescription": "A fast, cross-platform port monitoring and process management tool built for developers.",
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.13",
      "exceptionDomain": "",
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": null
    },
    "linux": {
      "deb": {
        "depends": []
      },
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  },
  "plugins": {}
}
```

### Platform-Specific Permissions

**Capabilities required:**

- **Windows**: Administrator privileges for full port information
- **macOS**: Accessibility permissions for process management
- **Linux**: Root or CAP_NET_ADMIN for network monitoring

**Graceful degradation:**
- Limited info without elevated privileges
- Prompt user to grant permissions when needed
- Show capabilities available at current privilege level

---

## Performance Optimization

### 1. Efficient Data Fetching

```rust
// Use caching to avoid repeated system calls
use std::time::{Duration, Instant};

pub struct CachedPortMonitor {
    monitor: PortMonitor,
    cache: Option<(Instant, Vec<Port>)>,
    cache_duration: Duration,
}

impl CachedPortMonitor {
    pub fn get_active_ports_cached(&mut self) -> Result<Vec<Port>> {
        if let Some((timestamp, ref data)) = self.cache {
            if timestamp.elapsed() < self.cache_duration {
                return Ok(data.clone());
            }
        }

        let ports = self.monitor.get_active_ports()?;
        self.cache = Some((Instant::now(), ports.clone()));
        Ok(ports)
    }
}
```

### 2. Async Processing

```typescript
// Frontend: Debounce rapid refresh requests
import { useCallback } from 'react';
import { debounce } from 'lodash-es';

export function useOptimizedRefresh() {
  const debouncedRefresh = useCallback(
    debounce(() => {
      queryClient.invalidateQueries({ queryKey: ['ports'] });
    }, 300),
    []
  );

  return { refresh: debouncedRefresh };
}
```

### 3. Virtual Scrolling

```typescript
// Use react-virtual for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualProcessList({ processes }: { processes: Process[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: processes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => (
          <ProcessRow
            key={item.index}
            process={processes[item.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. Bundle Size Optimization

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

---

## Security Implementation

### 1. Privilege Escalation

```rust
#[tauri::command]
pub async fn request_elevated_privileges() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Request UAC elevation
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        let exe = std::env::current_exe()
            .map_err(|e| e.to_string())?;

        Command::new("powershell")
            .args(&[
                "-Command",
                &format!("Start-Process '{}' -Verb RunAs", exe.display())
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| e.to_string())?;

        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Unix: Prompt for sudo
        Err("Please restart with sudo/root privileges".to_string())
    }
}
```

### 2. Input Validation

```rust
// Validate port ranges
fn validate_port(port: u16) -> Result<u16, String> {
    if port == 0 {
        return Err("Port cannot be 0".to_string());
    }
    Ok(port)
}

// Validate PID
fn validate_pid(pid: u32) -> Result<u32, String> {
    if pid == 0 || pid > i32::MAX as u32 {
        return Err("Invalid PID".to_string());
    }
    Ok(pid)
}
```

### 3. CSP (Content Security Policy)

Already configured in `tauri.conf.json` to prevent XSS attacks.

---

## Build & Distribution

### Development Build

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
# Build for current platform
npm run tauri build

# Build for specific platform
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### Cross-Platform Build Matrix

```yaml
# GitHub Actions example
name: Build
on: [push]

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-20.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev \
            build-essential \
            curl \
            wget \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Install frontend dependencies
        run: npm install

      - name: Build
        run: npm run tauri build
```

### Distribution Packages

- **Windows**: `.msi` installer
- **macOS**: `.dmg` disk image, `.app` bundle
- **Linux**: `.deb`, `.AppImage`, `.rpm`

### Auto-Update Configuration

```json
// tauri.conf.json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.porter.app/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

---

## Testing Strategy

### 1. Unit Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_monitor_initialization() {
        let monitor = PortMonitor::new();
        assert!(monitor.system.processes().len() > 0);
    }

    #[tokio::test]
    async fn test_get_active_ports() {
        let mut monitor = PortMonitor::new();
        let result = monitor.get_active_ports();
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_port() {
        assert!(validate_port(8080).is_ok());
        assert!(validate_port(0).is_err());
    }
}
```

### 2. Integration Tests

```rust
// tests/integration/port_monitoring.rs
#[tokio::test]
async fn test_end_to_end_port_scan() {
    let mut monitor = PortMonitor::new();

    // Scan common dev ports
    let ports = monitor.scan_port_range(3000, 9000).await.unwrap();

    // Should find at least some ports
    assert!(!ports.is_empty());

    // Verify data structure
    for port in ports {
        assert!(port.port >= 3000 && port.port <= 9000);
        assert!(!port.ip_address.is_empty());
    }
}
```

### 3. Frontend Tests (Vitest + React Testing Library)

```typescript
// src/components/dashboard/__tests__/PortGrid.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PortGrid } from '../PortGrid';

describe('PortGrid', () => {
  const mockPorts = [
    { port: 3000, status: 'free', protocol: 'TCP', ip_address: '127.0.0.1' },
    { port: 8080, status: 'occupied', protocol: 'TCP', ip_address: '127.0.0.1' },
  ];

  it('renders common ports', () => {
    render(<PortGrid ports={mockPorts} onPortClick={jest.fn()} />);
    expect(screen.getByText('3000')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();
  });

  it('calls onPortClick when port is clicked', () => {
    const handleClick = jest.fn();
    render(<PortGrid ports={mockPorts} onPortClick={handleClick} />);

    fireEvent.click(screen.getByText('3000'));
    expect(handleClick).toHaveBeenCalledWith(mockPorts[0]);
  });
});
```

### 4. E2E Tests (Playwright)

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('full port monitoring workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for dashboard to load
  await expect(page.locator('text=Dashboard')).toBeVisible();

  // Check that port grid is displayed
  await expect(page.locator('text=3000')).toBeVisible();

  // Click on a port
  await page.click('text=8080');

  // Verify modal opens
  await expect(page.locator('text=Port 8080 Details')).toBeVisible();

  // Close modal
  await page.click('[aria-label="Close"]');

  // Verify modal is closed
  await expect(page.locator('text=Port 8080 Details')).not.toBeVisible();
});
```

---

## Development Setup

### Prerequisites

- **Node.js** 20.x or later
- **Rust** 1.75 or later
- **Platform-specific tools:**
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential`, `libwebkit2gtk-4.0-dev`

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/porter-app.git
cd porter-app

# Install frontend dependencies
npm install

# Install Tauri CLI
npm install --save-dev @tauri-apps/cli

# Run development server
npm run tauri dev
```

### Project Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

### Environment Variables

```bash
# .env.development
VITE_APP_NAME=Porter
VITE_API_URL=http://localhost:5173
VITE_LOG_LEVEL=debug

# .env.production
VITE_APP_NAME=Porter
VITE_LOG_LEVEL=error
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| App Launch Time | < 500ms | Fast startup |
| Port Scan (100 ports) | < 200ms | Responsive UI |
| Process Kill | < 100ms | Immediate feedback |
| Memory Usage (Idle) | < 50MB | Lightweight |
| Memory Usage (Active) | < 150MB | Efficient |
| CPU Usage (Idle) | < 1% | Background friendly |
| Bundle Size | < 5MB | Fast download |

### Comparison vs. Electron

| Metric | Tauri (Porter) | Electron Equivalent |
|--------|----------------|---------------------|
| Bundle Size | ~3-5 MB | ~85-120 MB |
| Memory (Idle) | ~40 MB | ~95 MB |
| Launch Time | ~400 ms | ~4000 ms |
| CPU (Idle) | < 1% | 2-3% |

---

## Future Enhancements

### Phase 1: Core Essentials (MVP)
- ✅ Basic port monitoring (scan common dev ports at startup)
- ✅ Process management (view process info, kill processes)
- ✅ Search and filter (search specific ports)
- ✅ Dark/Light mode support
- ✅ Simple, clean dashboard UI

### Phase 2: Enhanced UX
- Real-time monitoring (auto-refresh)
- Port favorites (save frequently checked ports)
- Port detail modal (full process information)
- Quick stats (free/occupied/system port counts)
- Keyboard shortcuts
- System tray integration
- Toast notifications

### Phase 3: Polish & Distribution
- Performance optimization (caching, debouncing, virtual scrolling)
- Port profiles (save groups of ports to monitor)
- Export current state (JSON/CSV)
- Cross-platform builds (Windows .msi, macOS .dmg, Linux .deb/.AppImage)
- Enhanced error handling & security
- Settings panel (refresh interval, port range, theme preferences)

---

## Conclusion

This technical implementation guide provides a blueprint for building Porter as a simple, sleek, and fast port monitoring tool using Tauri, React, and Rust. The architecture leverages React for an excellent UI developer experience and Rust for performance and safety in system-level operations.

**Key Technical Advantages:**
1. **58% less memory** than Electron alternatives
2. **96% smaller bundle** (3-5MB vs 85MB+)
3. **Native performance** through Rust
4. **Cross-platform** with single codebase (Windows, macOS, Linux)
5. **Type-safe** end-to-end with TypeScript + Rust
6. **Secure** by default with Tauri's security model

**Scope Focus:**
- Simple, essential features only
- Fast startup and responsive UI
- Clean, modern interface with dark/light mode
- Secure process management
- No bloat: no CLI, no team features, no auto-start, no network traffic visualization
