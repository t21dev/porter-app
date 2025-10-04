import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Port } from '@/types/api';

interface PortListItemProps {
  port: Port;
  onKill: (pid: number) => void;
}

export function PortListItem({ port, onKill }: PortListItemProps) {
  const isOccupied = port.status === 'occupied';
  const isFree = port.status === 'free';

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
      className={`rounded-lg border ${statusColors[port.status]} p-4 flex items-center justify-between hover:bg-accent/5 transition-colors`}
    >
      <div className="flex items-center space-x-4 flex-1">
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${dotColors[port.status]}`} />
          <span className="text-xl font-bold text-foreground">{port.port}</span>
        </div>

        {/* Status Badge */}
        <Badge variant={badgeVariants[port.status]} className="uppercase text-xs">
          {port.status}
        </Badge>

        {/* Process Info */}
        <div className="flex-1">
          {isOccupied && port.process ? (
            <div>
              <div className="text-sm font-medium text-foreground">
                {port.process.name}
              </div>
              <div className="text-xs text-muted-foreground">PID: {port.process.pid}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No process running</div>
          )}
        </div>
      </div>

      {/* Kill Button */}
      {isOccupied && port.process && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onKill(port.process!.pid)}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Kill Process
        </Button>
      )}
    </div>
  );
}
