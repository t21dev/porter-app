import { Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface StatusFilterProps {
  selectedStatuses: Set<string>;
  onStatusToggle: (status: string) => void;
}

export function StatusFilter({ selectedStatuses, onStatusToggle }: StatusFilterProps) {
  const statuses = [
    { value: 'free', label: 'Free' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'system', label: 'System' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter Status
          {selectedStatuses.size < 3 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {selectedStatuses.size}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {statuses.map((status) => (
          <DropdownMenuCheckboxItem
            key={status.value}
            checked={selectedStatuses.has(status.value)}
            onCheckedChange={() => onStatusToggle(status.value)}
          >
            {status.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
