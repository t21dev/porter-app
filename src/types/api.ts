export type PortStatus = 'free' | 'occupied' | 'system';
export type Protocol = 'TCP' | 'UDP';

export interface Port {
  port: number;
  status: PortStatus;
  protocol: Protocol;
  process?: Process;
  ip_address: string;
  /** The Docker or Podman container that publishes this port. */
  container?: Container;
  /** Porter's advice: why the port is open, how far it reaches, what to do.
      Every port from get_active_ports has it; placeholders for pinned ports
      that aren't running don't. */
  advice?: Advice;
}

export interface Container {
  runtime: 'docker' | 'podman' | string;
  id: string;
  name: string;
  image: string;
  /** The port inside the container that this host port forwards to. */
  container_port: number;
}

/** How far a socket reaches, from its bind address. */
export type Exposure = 'local' | 'private' | 'public' | 'all';
export type Risk = 'ok' | 'low' | 'medium' | 'high';

export interface Advice {
  service: string | null;
  kind: string;
  purpose: string;
  exposure: Exposure;
  risk: Risk;
  recommendation: string;
  notes: string[];
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
