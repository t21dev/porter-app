import { Info, Github, ArrowUpRight } from 'lucide-react';
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
import { PorterMark } from '@/components/TitleBar';

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="About Porter" title="About">
          <Info className="h-[15px] w-[15px]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="items-start space-y-0 px-6 pb-5 pt-6">
          <PorterMark className="mb-4 h-9 w-9" />
          <DialogTitle className="text-[17px]">{aboutConfig.app.name}</DialogTitle>
          <DialogDescription className="pt-1.5 text-[13px] leading-relaxed">
            {aboutConfig.app.description}
          </DialogDescription>
          <span className="mt-3 inline-flex rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular">
            v{aboutConfig.app.version}
          </span>
          {aboutConfig.showTechStack && (
            <p className="pt-2 text-[12px] text-muted-foreground">{aboutConfig.techStack}</p>
          )}
        </DialogHeader>

        <div className="border-t border-border">
          <a
            href={aboutConfig.repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between px-6 py-3 text-[13px] text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <span className="inline-flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              {aboutConfig.repository.label}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-subtle transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-foreground" />
          </a>
          <a
            href={aboutConfig.organization.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between border-t border-border px-6 py-3 text-[13px] text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <span className="text-muted-foreground">
              An open-source project of{' '}
              <span className="font-medium text-foreground">{aboutConfig.organization.name}</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-subtle transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-foreground" />
          </a>
        </div>

        <div className="border-t border-border px-6 py-3">
          <p className="text-[11px] text-subtle">
            © {aboutConfig.license.year} {aboutConfig.license.holder} · {aboutConfig.license.type}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
