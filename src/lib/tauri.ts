import { invoke } from '@tauri-apps/api/core';
import { Port, SystemInfo } from '@/types/api';

// Port monitoring commands
/** Listening ports, plus every connection's local port when asked for. */
export async function getActivePorts(includeConnections = false): Promise<Port[]> {
  return await invoke<Port[]>('get_active_ports', { includeConnections });
}

export async function getCommonPorts(ports?: number[]): Promise<Port[]> {
  return await invoke<Port[]>('get_common_ports', { ports });
}

export async function getPortDetails(port: number): Promise<Port | null> {
  return await invoke<Port | null>('get_port_details', { port });
}

// Process management commands
export async function killProcess(pid: number): Promise<boolean> {
  return await invoke<boolean>('kill_process', { pid });
}

export async function killProcessByPort(port: number): Promise<boolean> {
  return await invoke<boolean>('kill_process_by_port', { port });
}

// System commands
export async function getSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>('get_system_info');
}

export async function isElevated(): Promise<boolean> {
  return await invoke<boolean>('is_elevated');
}

/** Whether `porter`, the terminal version bundled with the app, runs in a new terminal. */
export interface CliStatus {
  bundled: string | null;
  on_path: boolean;
  /** The setting can add or remove it. */
  can_toggle: boolean;
  /** Why it can't, or how to run it instead. */
  note: string | null;
}

export async function getCliStatus(): Promise<CliStatus> {
  return await invoke<CliStatus>('get_cli_status');
}

/** Put porter on the PATH or take it off. macOS asks for the password. */
export async function setCliOnPath(on: boolean): Promise<CliStatus> {
  return await invoke<CliStatus>('set_cli_on_path', { on });
}
