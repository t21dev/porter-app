import { Moon, Sun, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/themeStore';
import { PortSettings } from './PortSettings';
import { AboutDialog } from './AboutDialog';
import { UpdateNotice } from './UpdateNotice';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/** Action cluster rendered inside the title bar. */
export function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <>
      <UpdateNotice />
      <PortSettings />

      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh ports"
        title="Refresh"
      >
        <RefreshCw
          className={cn('h-[15px] w-[15px]', isRefreshing && 'animate-spin')}
          style={{ animationDuration: '900ms' }}
        />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Light theme' : 'Dark theme'}
        className="relative overflow-hidden"
      >
        <Sun
          className={cn(
            'absolute h-[15px] w-[15px] transition-all duration-300 ease-out',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
          )}
        />
        <Moon
          className={cn(
            'absolute h-[15px] w-[15px] transition-all duration-300 ease-out',
            isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
      </Button>

      <AboutDialog />
    </>
  );
}
