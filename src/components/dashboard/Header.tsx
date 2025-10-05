import { Moon, Sun, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/themeStore';
import { PortSettings } from './PortSettings';
import { AboutDialog } from './AboutDialog';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="border-b border-border/40 bg-background">
      <div className="container flex justify-between items-center px-6 h-14">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-blue-500" />
          <div>
            <div className="text-lg font-bold text-foreground">Porter</div>
            <div className="text-xs text-muted-foreground">Port Monitor</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
         

          <PortSettings />

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-8 h-8"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          <AboutDialog />
        </div>
      </div>
    </header>
  );
}
