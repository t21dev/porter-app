import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Activity, Minus, Square, X, Copy } from 'lucide-react';

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };

    checkMaximized();

    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 border-b border-border/40 bg-background select-none"
    >
      {/* Left: Icon and Title */}
      <div data-tauri-drag-region className="flex items-center px-3 gap-2">
        <Activity className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-medium text-foreground">Porter</span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="Minimize"
        >
          <Minus className="h-3 w-3" />
        </button>

        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>

        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
