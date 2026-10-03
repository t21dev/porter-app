export type PortStatus = 'free' | 'occupied' | 'system';
export type Protocol = 'TCP' | 'UDP';

export interface Port {
  port: number;
  status: PortStatus;
  protocol: Protocol;
  process?: Process;
  ip_address: string;
}

/** The port list carries only pid and name. The rest comes from
    get_port_details, for one port at a time. */
export interface Process {
  pid: number;
  name: string;
  path?: string;
  command?: string;
  working_dir?: string;
  memory_usage?: number;
  started_at?: string;
  user?: string;
}

export interface SystemInfo {
  os: string;
  os_version: string;
  hostname: string;
  cpu_count: number;
  total_memory: number;
}
