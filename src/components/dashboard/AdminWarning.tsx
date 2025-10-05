import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';

export function AdminWarning() {
  const handleRestartAsAdmin = async () => {
    try {
      await invoke('request_elevation');
    } catch (error) {
      console.error('Failed to request elevation:', error);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Porter is running without administrator privileges. To kill processes, please restart as Administrator.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestartAsAdmin}
          className="ml-4 shrink-0"
        >
          Restart as Admin
        </Button>
      </AlertDescription>
    </Alert>
  );
}
