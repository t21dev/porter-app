import { useState } from 'react';
import { Info, Github, ArrowUpRight, RefreshCw, Check, ArrowDown } from 'lucide-react';
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
import { useUpdateCheck } from '@/hooks/useUpdateCheck';
import { UpdateDialog } from './UpdateNotice';
import { cn } from '@/lib/utils';

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

        <UpdateRow />

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

function UpdateRow() {
  const { data, isFetching, isError, refetch } = useUpdateCheck();
  const [notesOpen, setNotesOpen] = useState(false);

  let status: React.ReactNode;
  if (isFetching) {
    status = 'Checking for updates…';
  } else if (isError) {
    status = 'Could not reach GitHub';
  } else if (data?.available) {
    status = (
      <span className="text-free">
        Version <span className="font-mono tabular">{data.latest}</span> is available
      </span>
    );
  } else if (data) {
    status = (
      <span className="inline-flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-free" />
        You&apos;re up to date
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
      <span className="text-[13px] text-muted-foreground">{status}</span>
      {data?.available && !isFetching ? (
        <>
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-primary/85 active:scale-[0.97]"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            View update
          </button>
          <UpdateDialog info={data} open={notesOpen} onOpenChange={setNotesOpen} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Check now
        </button>
      )}
    </div>
  );
}
