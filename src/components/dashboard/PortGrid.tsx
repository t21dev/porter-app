import { Port } from '@/types/api';
import { PortCard } from './PortCard';

interface PortGridProps {
  ports: Port[];
  onPortClick: (port: Port) => void;
}

export function PortGrid({ ports, onPortClick }: PortGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {ports.map((port) => (
        <PortCard key={port.port} port={port} onClick={() => onPortClick(port)} />
      ))}
    </div>
  );
}
