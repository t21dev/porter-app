import { Port } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PortCardProps {
  port: Port;
  onClick: () => void;
}

export function PortCard({ port, onClick }: PortCardProps) {
  const getStatusColor = (status: Port['status']) => {
    switch (status) {
      case 'free':
        return 'text-success';
      case 'occupied':
        return 'text-destructive';
      case 'system':
        return 'text-warning';
    }
  };

  const getStatusBg = (status: Port['status']) => {
    switch (status) {
      case 'free':
        return 'bg-success/10 hover:bg-success/20';
      case 'occupied':
        return 'bg-destructive/10 hover:bg-destructive/20';
      case 'system':
        return 'bg-warning/10 hover:bg-warning/20';
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        getStatusBg(port.status),
        'border-2'
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className={cn('text-3xl font-bold mb-2', getStatusColor(port.status))}>
          {port.port}
        </div>
        <div className="text-sm text-muted-foreground uppercase font-medium">
          {port.status}
        </div>
        {port.process && (
          <div className="text-xs text-muted-foreground mt-2 truncate max-w-full">
            {port.process.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
