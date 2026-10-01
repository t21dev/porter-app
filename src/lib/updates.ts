import { open } from '@tauri-apps/plugin-shell';
import { aboutConfig } from '@/config/about';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/t21dev/porter-app/releases/latest';
const DISMISSED_KEY = 'porter-dismissed-update';

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  url: string;
  notes: string;
  publishedAt?: string;
}

/** Compares dotted versions ("v1.2.3", "1.2.3-beta"). Returns >0 when a is newer. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const res = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`GitHub responded with ${res.status}`);
  }
  const release = await res.json();
  const latest = String(release.tag_name ?? '').replace(/^v/i, '');
  const current = aboutConfig.app.version;

  return {
    available: latest !== '' && compareVersions(latest, current) > 0,
    current,
    latest,
    url: release.html_url ?? `${aboutConfig.repository.url}/releases/latest`,
    notes: release.body ?? '',
    publishedAt: release.published_at,
  };
}

export async function openReleasePage(url: string) {
  try {
    await open(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function dismissVersion(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // Storage unavailable; the pill simply reappears next launch.
  }
}
