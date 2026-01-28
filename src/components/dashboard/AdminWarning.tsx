import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

interface SystemInfo {
  os: string;
  os_version: string;
  hostname: string;
  cpu_count: number;
  total_memory: number;
}

export function AdminWarning() {
  const [isWindows, setIsWindows] = useState(true); // Default to Windows behavior

  useEffect(() => {
    invoke<SystemInfo>('get_system_info').then((info) => {
      setIsWindows(info.os === 'windows');
    });
  }, []);

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
          {isWindows
            ? 'Porter is running without administrator privileges. To kill processes, please restart as Administrator.'
            : 'Porter is running without elevated privileges. You\'ll be prompted for your password when killing processes that require it.'}
        </span>
        {isWindows && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartAsAdmin}
            className="ml-4 shrink-0"
          >
            Restart as Admin
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
