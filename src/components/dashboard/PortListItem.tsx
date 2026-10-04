import { memo, type CSSProperties } from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import { Port } from '@/types/api';
import { getPortTypeInfo } from '@/lib/portTypes';
import { cn } from '@/lib/utils';
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
  isPinned?: boolean;
  /** Show the pin glyph (useful when pinned and unpinned rows are mixed). */
  showPin?: boolean;
  /** Position in the list, used to stagger the entrance (capped). */
  index?: number;
  /** Pin or unpin this port. Shows the pin button when given. */
  onTogglePin?: (port: number) => void;
}

const statusStyles = {
  free: { dot: 'bg-free', text: 'text-free', tint: 'bg-free/10', label: 'Free' },
  occupied: { dot: 'bg-occupied', text: 'text-occupied', tint: 'bg-occupied/10', label: 'In use' },
  system: { dot: 'bg-system', text: 'text-system', tint: 'bg-system/10', label: 'System' },
} as const;

// Memoised: a poll returns the same object for a port that did not change, so
// only rows whose port actually changed re-render.
export const PortListItem = memo(function PortListItem({ port, onKill, isPinned = false, showPin = false, index = 0, onTogglePin }: PortListItemProps) {
  const isOccupied = port.status === 'occupied';
  const portType = getPortTypeInfo(port.port);
  const PortIcon = portType.icon;
  const s = statusStyles[port.status];
  const hasProcess = port.process && port.status !== 'free';

  return (
    <div
      className="reveal group relative flex h-12 items-center gap-3 px-3.5 transition-colors duration-150 ease-out hover:bg-accent"
      style={{ '--i': Math.min(index, 14) } as CSSProperties}
    >
      {/* Status dot */}
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        {isOccupied && (
          <span className={cn('absolute inset-0 rounded-full opacity-40 blur-[3px]', s.dot)} />
        )}
        <span className={cn('relative h-1.5 w-1.5 rounded-full', s.dot)} />
      </span>

      {/* Port number */}
      <span className="w-[52px] shrink-0 font-mono text-[14px] font-medium tracking-[-0.02em] text-foreground tabular">
        {port.port}
      </span>

      {/* Service */}
      <div className="flex w-[118px] shrink-0 items-center gap-1.5 text-muted-foreground">
        <PortIcon className="h-3.5 w-3.5 shrink-0 text-subtle" strokeWidth={1.75} />
        <span className="truncate text-[12.5px]">{portType.label}</span>
        {isPinned && showPin && (
          <Pin
            className="h-3 w-3 shrink-0 rotate-45 fill-current text-subtle"
            aria-label="Pinned"
          />
        )}
      </div>

      {/* Process */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hasProcess ? (
          <>
            <span className="truncate text-[12.5px] font-medium text-foreground">
              {port.process!.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-subtle tabular">
              {port.process!.pid}
            </span>
          </>
        ) : (
          <span className="text-[12.5px] text-subtle">—</span>
        )}
      </div>

      {/* Status */}
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
          s.text,
          s.tint
        )}
      >
        {s.label}
      </span>

      {/* Pin: on hover or keyboard focus, so the row stays calm at rest */}
      {onTogglePin && (
        <button
          type="button"
          onClick={() => onTogglePin(port.port)}
          aria-label={isPinned ? `Unpin port ${port.port}` : `Pin port ${port.port}`}
          aria-pressed={isPinned}
          title={isPinned ? 'Unpin' : 'Pin to the top'}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle',
            'opacity-0 transition-[opacity,background-color,color,scale] duration-150 ease-out',
            'group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent hover:text-foreground',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90'
          )}
        >
          {isPinned ? (
            <PinOff className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <Pin className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </button>
      )}

      {/* Kill */}
      <div className="flex w-7 shrink-0 justify-end">
        {isOccupied && port.process && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`Kill ${port.process.name} on port ${port.port}`}
                title="Kill process"
                className="flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-[background-color,color,scale] duration-150 ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-90"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kill process?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                      <span className="truncate font-medium text-foreground">
                        {port.process.name}
                      </span>
                      <span className="shrink-0 font-mono text-[12px] text-subtle tabular">
                        PID {port.process.pid} · :{port.port}
                      </span>
                    </div>
                    <p>The process will be terminated immediately. Unsaved work in it may be lost.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onKill(port.process!.pid)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Kill process
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
});
