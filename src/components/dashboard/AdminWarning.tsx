import { ShieldAlert, ArrowUpRight } from 'lucide-react';
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
    <div
      role="status"
      className="reveal flex items-center gap-3 rounded-lg border border-occupied/20 bg-occupied/6 py-2.5 pl-3 pr-2"
    >
      <ShieldAlert className="h-4 w-4 shrink-0 text-occupied" strokeWidth={1.75} />
      <p className="flex-1 text-[12.5px] leading-snug text-muted-foreground">
        {isWindows ? (
          <>
            <span className="font-medium text-foreground">Limited mode.</span> Restart as
            Administrator to kill processes.
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">Not elevated.</span> You&apos;ll be asked
            for your password when a process needs it.
          </>
        )}
      </p>
      {isWindows && (
        <button
          type="button"
          onClick={handleRestartAsAdmin}
          className="group inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-occupied transition-colors duration-150 ease-out hover:bg-occupied/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-occupied/40 active:scale-[0.97]"
        >
          Restart as admin
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px" />
        </button>
      )}
    </div>
  );
}
