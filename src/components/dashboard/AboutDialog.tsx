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
import { aboutConfig } from '@/config/about';

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About {aboutConfig.app.name}</DialogTitle>
          <DialogDescription>
            {aboutConfig.app.description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Version <span className="font-medium text-foreground">{aboutConfig.app.version}</span>
            </p>
            {aboutConfig.showTechStack && (
              <p className="text-sm text-muted-foreground">
                {aboutConfig.techStack}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              An Opensource Project of{' '}
              <a
                href={aboutConfig.organization.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-500 hover:underline"
              >
                {aboutConfig.organization.name}
              </a>
            </p>
            <a
              href={aboutConfig.repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex gap-2 items-center text-sm transition-colors text-muted-foreground hover:text-emerald-500"
            >
              <Github className="w-4 h-4" />
              {aboutConfig.repository.label}
            </a>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              © {aboutConfig.license.year} {aboutConfig.license.holder}. Licensed under {aboutConfig.license.type}.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
