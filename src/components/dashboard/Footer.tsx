import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background py-4 mt-8">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">
            An Opensource Project of{' '}
            <a
              href="https://t21.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              t21.dev
            </a>
          </p>
          <a
            href="https://github.com/t21dev/porter-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
