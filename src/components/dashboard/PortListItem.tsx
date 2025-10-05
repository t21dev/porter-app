import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Port } from '@/types/api';
import { getPortTypeInfo } from '@/lib/portTypes';

interface PortListItemProps {
  port: Port;
  onKill: (pid: number) => void;
}

export function PortListItem({ port, onKill }: PortListItemProps) {
  const isOccupied = port.status === 'occupied';
  const portType = getPortTypeInfo(port.port);
  const PortIcon = portType.icon;

  const statusColors = {
    free: 'border-green-500/50 bg-green-500/10',
    occupied: 'border-red-500/50 bg-red-500/10',
    system: 'border-yellow-500/50 bg-yellow-500/10',
  };

  const dotColors = {
    free: 'bg-green-500',
    occupied: 'bg-red-500',
    system: 'bg-yellow-500',
  };

  const badgeVariants = {
    free: 'default',
    occupied: 'destructive',
    system: 'secondary',
  } as const;

  return (
    <div
      className={`rounded-lg border ${statusColors[port.status]} p-3 flex items-center justify-between hover:bg-accent/5 transition-colors`}
    >
      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
        {/* Port Icon */}
        <div className={`${portType.color} flex-shrink-0`}>
          <PortIcon className="h-4 w-4" />
        </div>

        {/* Port Number & Status */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <div className={`h-1.5 w-1.5 rounded-full ${dotColors[port.status]}`} />
          <span className="text-base font-bold text-foreground">{port.port}</span>
        </div>

        {/* Port Type Label */}
        <span className="text-xs text-muted-foreground flex-shrink-0">{portType.label}</span>

        {/* Status Badge */}
        <Badge variant={badgeVariants[port.status]} className="uppercase text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
          {port.status}
        </Badge>

        {/* Process Info */}
        <div className="flex-1 min-w-0">
          {isOccupied && port.process ? (
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-foreground truncate">
                {port.process.name}
              </div>
              <div className="text-[10px] text-muted-foreground flex-shrink-0">PID: {port.process.pid}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No process</div>
          )}
        </div>
      </div>

      {/* Kill Button */}
      {isOccupied && port.process && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onKill(port.process!.pid)}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 flex-shrink-0"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Kill
        </Button>
      )}
    </div>
  );
}
