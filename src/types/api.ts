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
  memory_usage: number;
  started_at: string;
  user?: string;
}

export interface SystemInfo {
  os: string;
  os_version: string;
  hostname: string;
  cpu_count: number;
  total_memory: number;
}
