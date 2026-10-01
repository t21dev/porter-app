import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';
import { dismissVersion, getDismissedVersion, openReleasePage, type UpdateInfo } from '@/lib/updates';

/** Title-bar pill shown when a newer release exists on GitHub. */
export function UpdateNotice() {
  const { data } = useUpdateCheck();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(getDismissedVersion);

  if (!data?.available || dismissed === data.latest) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mr-1 inline-flex h-7 items-center gap-1.5 rounded-full border border-free/25 bg-free/10 pl-2 pr-2.5 text-[11.5px] font-medium text-free transition-[background-color,transform] duration-150 ease-out hover:bg-free/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-free/40 animate-in fade-in slide-in-from-right-2 duration-500"
        title={`Porter ${data.latest} is available`}
      >
        <ArrowDown className="h-3 w-3" strokeWidth={2.25} />
        Update
      </button>

      <UpdateDialog
        info={data}
        open={open}
        onOpenChange={setOpen}
        onLater={() => {
          dismissVersion(data.latest);
          setDismissed(data.latest);
          setOpen(false);
        }}
      />
    </>
  );
}

interface UpdateDialogProps {
  info: UpdateInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLater?: () => void;
}

export function UpdateDialog({ info, open, onOpenChange, onLater }: UpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Porter {info.latest} is available</DialogTitle>
          <DialogDescription>
            You have <span className="font-mono text-foreground tabular">{info.current}</span>.
            Download the new installer to update; your pinned ports and settings are kept.
          </DialogDescription>
        </DialogHeader>

        {info.notes.trim() && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background px-4 py-3">
            <ReleaseNotes markdown={info.notes} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onLater ?? (() => onOpenChange(false))}>
            Later
          </Button>
          <Button size="sm" onClick={() => openReleasePage(info.url)}>
            <ArrowDown className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Minimal renderer for GitHub release bodies: headings, bullets, paragraphs. */
function ReleaseNotes({ markdown }: { markdown: string }) {
  const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  const lines = markdown.split(/\r?\n/).map((l) => l.trimEnd());

  return (
    <div className="space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const heading = line.match(/^#{1,6}\s+(.*)/);
        if (heading) {
          return (
            <p key={i} className="pt-1.5 text-[12px] font-semibold text-foreground first:pt-0">
              {clean(heading[1])}
            </p>
          );
        }
        const bullet = line.match(/^\s*[-*]\s+(.*)/);
        if (bullet) {
          return (
            <p key={i} className="flex gap-2">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-subtle" />
              <span>{clean(bullet[1])}</span>
            </p>
          );
        }
        return <p key={i}>{clean(line)}</p>;
      })}
    </div>
  );
}
