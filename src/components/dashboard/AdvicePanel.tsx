import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Port, Process } from '@/types/api';
import { getPortDetails } from '@/lib/tauri';
import { formatBytes, formatUptime } from '@/lib/utils';

const reachLong = {
  local: 'This machine only',
  private: 'Local network',
  public: 'A public address',
  all: 'All interfaces: any network this machine is on',
} as const;

/**
 * A row's advice, opened in place under it (DESIGN.md, Advice panel): why the
 * port is open, how far it reaches, what to do, and the process details,
 * loaded when it opens.
 */
export function AdvicePanel({ port, open, id }: { port: Port; open: boolean; id: string }) {
  const advice = port.advice;
  const [details, setDetails] = useState<Process | null>(null);
  const [copied, setCopied] = useState(false);
  const pid = port.process?.pid;

  // Details are looked up by port over TCP; keep them only when they name the
  // same process as the row.
  useEffect(() => {
    if (!open || port.protocol !== 'TCP' || !pid) return;
    let live = true;
    getPortDetails(port.port)
      .then((d) => {
        if (live && d?.process?.pid === pid) setDetails(d.process);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, port.port, port.protocol, pid]);

  if (!advice) return null;
  const c = port.container;
  // Why open already names the container; keep only notes that add something.
  const notes = advice.notes.filter((n) => !(c && n === `Published by container ${c.name} (${c.image}).`));
  // A container published beyond this machine has a one-line fix.
  const fix = c && advice.exposure !== 'local' ? `127.0.0.1:${port.port}:${c.container_port}` : null;

  const copyFix = async () => {
    if (!fix) return;
    try {
      await navigator.clipboard.writeText(fix);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard refused: the value is on screen to select. */
    }
  };

  return (
    <div id={id} className="collapse-grid" data-open={open}>
      <div>
        {open && (
          <div className="space-y-2.5 border-t border-border bg-background py-3 pl-[76px] pr-4 text-[12.5px]">
            <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-subtle">Why open</dt>
              <dd className="min-w-0 text-foreground">
                {advice.purpose}
                {c && (
                  <span className="text-muted-foreground">
                    {' '}
                    In {c.runtime} container <span className="font-medium text-foreground">{c.name}</span> ({c.image}),
                    port {c.container_port} inside.
                  </span>
                )}
              </dd>
              <dt className="text-subtle">Reach</dt>
              <dd className="min-w-0">
                {reachLong[advice.exposure]}{' '}
                <span className="font-mono text-[11.5px] text-subtle">{port.ip_address}</span>
              </dd>
              <dt className="text-subtle">What to do</dt>
              <dd className="min-w-0 border-l-2 border-border pl-2.5 text-foreground">{advice.recommendation}</dd>
              {details?.path && (
                <>
                  <dt className="text-subtle">Program</dt>
                  <dd className="min-w-0 break-all font-mono text-[11.5px] text-muted-foreground">{details.path}</dd>
                </>
              )}
              {details?.started_at && (
                <>
                  <dt className="text-subtle">Running for</dt>
                  <dd className="min-w-0 text-muted-foreground">
                    {formatUptime(details.started_at)}
                    {details.memory_usage !== undefined && `, ${formatBytes(details.memory_usage)}`}
                  </dd>
                </>
              )}
            </dl>
            {notes.length > 0 && (
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            {fix && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-[12px] text-subtle">Publish it as</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">{fix}</code>
                <button
                  type="button"
                  onClick={copyFix}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-free" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
