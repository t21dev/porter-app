import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-4 mt-8 border-t border-border/40 bg-background">
      <div className="container px-6 mx-auto">
        <div className="flex gap-4 justify-center items-center">
          <p className="text-sm text-muted-foreground">
            An Opensource Project of{' '}
            <a
              href="https://t21.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-green-500 hover:underline"
            >
              t21.dev
            </a>
          </p>
          <a
            href="https://github.com/t21dev/porter-app"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors text-muted-foreground hover:text-green-500"
            aria-label="View on GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
