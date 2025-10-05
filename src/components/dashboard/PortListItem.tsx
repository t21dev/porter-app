import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Port } from '@/types/api';
import { getPortTypeInfo } from '@/lib/portTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PortListItemProps {
  port: Port;
  onKill: (pid: number) => void;
}

export function PortListItem({ port, onKill }: PortListItemProps) {
  const isOccupied = port.status === 'occupied';
  const portType = getPortTypeInfo(port.port);
  const PortIcon = portType.icon;

  const statusColors = {
    free: 'border-emerald-500/40 bg-emerald-500/10',
    occupied: 'border-amber-500/40 bg-amber-500/10',
    system: 'border-blue-500/40 bg-blue-500/10',
  };

  const dotColors = {
    free: 'bg-emerald-500',
    occupied: 'bg-amber-500',
    system: 'bg-blue-500',
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 flex-shrink-0"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Kill
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kill Process?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to kill <strong>{port.process.name}</strong> (PID: {port.process.pid}) on port {port.port}?
                <br />
                This action cannot be undone and may cause data loss.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onKill(port.process!.pid)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Kill Process
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
