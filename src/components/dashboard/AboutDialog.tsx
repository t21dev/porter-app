import { Info, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About Porter</DialogTitle>
          <DialogDescription>
            A sleek, fast, and secure desktop port monitoring application
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Version <span className="font-medium text-foreground">0.1.0</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Built with Tauri, React, and TypeScript
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              An Opensource Project of{' '}
              <a
                href="https://t21.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-500 hover:underline"
              >
                t21.dev
              </a>
            </p>
            <a
              href="https://github.com/t21dev/porter-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              © 2025 Porter. Licensed under MIT License.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
