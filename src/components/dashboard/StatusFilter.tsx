import { cn } from '@/lib/utils';

interface StatusFilterProps {
  selectedStatuses: Set<string>;
  onStatusToggle: (status: string) => void;
}

const statuses = [
  { value: 'free', label: 'Free', dot: 'bg-free', ring: 'border-free' },
  { value: 'occupied', label: 'Occupied', dot: 'bg-occupied', ring: 'border-occupied' },
  { value: 'system', label: 'System', dot: 'bg-system', ring: 'border-system' },
];

/** Segmented multi-toggle for status visibility. */
export function StatusFilter({ selectedStatuses, onStatusToggle }: StatusFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-[3px]"
    >
      {statuses.map((status) => {
        const active = selectedStatuses.has(status.value);
        return (
          <button
            key={status.value}
            type="button"
            aria-pressed={active}
            onClick={() => onStatusToggle(status.value)}
            className={cn(
              'flex h-full items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium',
              'transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96]',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50',
              active ? 'bg-elevated text-foreground' : 'text-subtle hover:text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full border transition-[background-color,scale] duration-200 ease-out',
                status.ring,
                active ? cn(status.dot, 'scale-100') : 'scale-90 bg-transparent'
              )}
            />
            {status.label}
          </button>
        );
      })}
    </div>
  );
}
