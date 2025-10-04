import { Port } from '@/types/api';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes, formatUptime } from '@/lib/utils';

interface PortDetailModalProps {
  port: Port | null;
  onClose: () => void;
  onKill?: (pid: number) => void;
}

export function PortDetailModal({ port, onClose, onKill }: PortDetailModalProps) {
  if (!port) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Port {port.port} Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Port Info */}
          <div>
            <h3 className="font-semibold mb-2">Port Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Status:</div>
              <div className="capitalize font-medium">{port.status}</div>
              <div className="text-muted-foreground">Protocol:</div>
              <div>{port.protocol}</div>
              <div className="text-muted-foreground">IP Address:</div>
              <div className="font-mono">{port.ip_address}:{port.port}</div>
            </div>
          </div>

          {/* Process Info */}
          {port.process && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Process Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div className="font-medium">{port.process.name}</div>
                  <div className="text-muted-foreground">PID:</div>
                  <div className="font-mono">{port.process.pid}</div>
                  <div className="text-muted-foreground">Path:</div>
                  <div className="font-mono text-xs break-all">{port.process.path}</div>
                  <div className="text-muted-foreground">Command:</div>
                  <div className="font-mono text-xs break-all">{port.process.command}</div>
                  {port.process.working_dir && (
                    <>
                      <div className="text-muted-foreground">Working Dir:</div>
                      <div className="font-mono text-xs break-all">{port.process.working_dir}</div>
                    </>
                  )}
                  <div className="text-muted-foreground">Started:</div>
                  <div>{formatUptime(port.process.started_at)} ago</div>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Resource Usage</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">CPU:</div>
                  <div>{port.process.cpu_usage.toFixed(1)}%</div>
                  <div className="text-muted-foreground">Memory:</div>
                  <div>{formatBytes(port.process.memory_usage)}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {onKill && port.status !== 'system' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onKill(port.process!.pid);
                      onClose();
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Kill Process
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
