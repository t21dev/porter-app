import { LucideIcon, Globe, Database, Server, Code, Package, FileCode } from 'lucide-react';

export interface PortTypeInfo {
  icon: LucideIcon;
  label: string;
  color: string;
}

const PORT_TYPES: Record<number, PortTypeInfo> = {
  // Web servers
  80: { icon: Globe, label: 'HTTP', color: 'text-blue-500' },
  443: { icon: Globe, label: 'HTTPS', color: 'text-blue-500' },
  8080: { icon: Globe, label: 'HTTP Alt', color: 'text-blue-500' },
  8000: { icon: Globe, label: 'HTTP Dev', color: 'text-blue-500' },
  3000: { icon: Globe, label: 'React/Node', color: 'text-cyan-500' },
  3001: { icon: Globe, label: 'Next.js', color: 'text-cyan-500' },
  4200: { icon: Globe, label: 'Angular', color: 'text-red-500' },
  5173: { icon: Globe, label: 'Vite', color: 'text-purple-500' },
  5000: { icon: Globe, label: 'Flask', color: 'text-green-500' },

  // Databases
  5432: { icon: Database, label: 'PostgreSQL', color: 'text-blue-600' },
  3306: { icon: Database, label: 'MySQL', color: 'text-orange-500' },
  27017: { icon: Database, label: 'MongoDB', color: 'text-green-600' },
  6379: { icon: Database, label: 'Redis', color: 'text-red-600' },
  1433: { icon: Database, label: 'MSSQL', color: 'text-blue-500' },

  // Application servers
  9000: { icon: Server, label: 'PHP-FPM', color: 'text-indigo-500' },
  8081: { icon: Server, label: 'App Server', color: 'text-purple-500' },

  // Development tools
  9229: { icon: Code, label: 'Node Debug', color: 'text-yellow-500' },
  5858: { icon: Code, label: 'Java Debug', color: 'text-orange-600' },

  // Package managers
  4873: { icon: Package, label: 'Verdaccio', color: 'text-teal-500' },
};

export function getPortTypeInfo(port: number): PortTypeInfo {
  return PORT_TYPES[port] || {
    icon: FileCode,
    label: 'Unknown',
    color: 'text-gray-500'
  };
}
