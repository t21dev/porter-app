import { useState, useEffect, type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isMac } from '@/lib/platform';
import { cn } from '@/lib/utils';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  children?: ReactNode;
  /** Changes whenever fresh data lands; replays the live-dot pulse. */
  pulseKey?: number;
}

export function TitleBar({ children, pulseKey }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMac) return;
    const checkMaximized = async () => setIsMaximized(await appWindow.isMaximized());
    checkMaximized();
    const unlisten = appWindow.onResized(checkMaximized);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className={cn(
        'relative z-20 flex h-12 shrink-0 items-center justify-between select-none',
        'border-b border-border/70 bg-background/80 backdrop-blur-md',
        isMac ? 'pl-[84px]' : 'pl-4'
      )}
    >
      {/* Wordmark */}
      <div data-tauri-drag-region className="flex items-center gap-2.5 pointer-events-none">
        <PorterMark />
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Porter</span>
        <span className="relative ml-0.5 flex h-1.5 w-1.5" aria-hidden>
          <span
            key={pulseKey}
            className="absolute inset-0 rounded-full bg-free"
            style={{ animation: 'ping-once 900ms var(--ease-out) both' }}
          />
          <span className="relative h-1.5 w-1.5 rounded-full bg-free" />
        </span>
        <span className="text-[11px] font-medium text-subtle">Live</span>
      </div>

      <div className="flex items-center h-full">
        <div className="flex items-center gap-0.5 pr-2">{children}</div>

        {!isMac && (
          <div className="flex items-center h-full border-l border-border/70">
            <WindowButton label="Minimize" onClick={() => appWindow.minimize()}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 5.5h8" stroke="currentColor" strokeWidth="1" />
              </svg>
            </WindowButton>
            <WindowButton
              label={isMaximized ? 'Restore' : 'Maximize'}
              onClick={() => appWindow.toggleMaximize()}
            >
              {isMaximized ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <rect x="1.5" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" />
                  <path d="M3.5 3V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H7" stroke="currentColor" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <rect x="1.5" y="1.5" width="7" height="7" rx="1.25" stroke="currentColor" />
                </svg>
              )}
            </WindowButton>
            <WindowButton label="Close" onClick={() => appWindow.close()} danger>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1" />
              </svg>
            </WindowButton>
          </div>
        )}
      </div>
    </div>
  );
}

function WindowButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-full w-11 items-center justify-center text-muted-foreground',
        'transition-colors duration-150 ease-out',
        'focus-visible:outline-hidden focus-visible:bg-accent focus-visible:text-foreground',
        danger
          ? 'hover:bg-[#e81123] hover:text-white active:bg-[#c50f1f]'
          : 'hover:bg-accent hover:text-foreground active:bg-elevated'
      )}
    >
      {children}
    </button>
  );
}

export function PorterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn('h-[18px] w-[18px] text-foreground', className)}
      fill="none"
      aria-hidden
    >
      <rect x="1" y="1" width="18" height="18" rx="5" stroke="currentColor" strokeOpacity="0.22" />
      <path
        d="M4.5 10h2.75l1.5-3.5 2.5 7 1.5-3.5h2.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
