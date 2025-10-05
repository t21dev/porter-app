import { invoke } from '@tauri-apps/api/core';
import { Port, SystemInfo } from '@/types/api';

// Port monitoring commands
export async function getActivePorts(): Promise<Port[]> {
  return await invoke<Port[]>('get_active_ports');
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
