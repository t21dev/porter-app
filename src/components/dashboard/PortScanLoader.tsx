import { Activity } from 'lucide-react';

export function PortScanLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Activity className="h-8 w-8 text-primary opacity-20" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Scanning ports...</p>
        <p className="text-xs text-muted-foreground mt-1">Please wait while we detect active ports</p>
      </div>
    </div>
  );
}
