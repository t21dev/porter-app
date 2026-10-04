/**
 * Turns a GitHub release body into the few block types the update dialog
 * shows: headings, bullets, paragraphs and code.
 *
 * Release bodies come from CHANGELOG.md, which hard-wraps at about 78
 * characters with two-space continuation indents. As in standard Markdown, a
 * single newline inside a paragraph or list item is a space, so those
 * continuation lines join the bullet they belong to.
 */
export type NoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; text: string };

/**
 * Sections dropped from the in-app notes. The checksums only help someone
 * verifying a file they downloaded from the release page, where they still
 * appear in full.
 */
const HIDDEN_SECTIONS = [/sha-?256/i, /checksums?/i];

/** Strips inline Markdown the dialog renders as plain text. */
export function stripInline(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseReleaseNotes(markdown: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  // The block that a plain line would continue, or null after a blank line,
  // heading or code block.
  let open: { type: 'bullet' | 'paragraph'; text: string } | null = null;
  // Set after a blank line inside a list item, so an indented line can still
  // continue that item.
  let lastBullet: { type: 'bullet'; text: string } | null = null;
  let hiddenLevel = 0;

  const push = (block: NoteBlock) => {
    if (hiddenLevel === 0) blocks.push(block);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\s+$/, '');

    const fence = raw.match(/^\s*(```|~~~)/);
    if (fence) {
      const body: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        body.push(lines[i].replace(/\s+$/, ''));
      }
      push({ type: 'code', text: body.join('\n') });
      open = null;
      lastBullet = null;
      continue;
    }

    if (!raw.trim()) {
      open = null;
      continue;
    }

    const heading = raw.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*$/);
    if (heading) {
      const level = heading[1].length;
      const text = stripInline(heading[2]);
      if (hiddenLevel && level <= hiddenLevel) hiddenLevel = 0;
      if (!hiddenLevel && HIDDEN_SECTIONS.some((re) => re.test(text))) hiddenLevel = level;
      push({ type: 'heading', text });
      open = null;
      lastBullet = null;
      continue;
    }

    const bullet = raw.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)/);
    if (bullet) {
      const block = { type: 'bullet' as const, text: bullet[1] };
      push(block);
      open = block;
      lastBullet = block;
      continue;
    }

    if (open) {
      open.text += ' ' + raw.trim();
    } else if (lastBullet && /^\s{2,}/.test(raw)) {
      lastBullet.text += ' ' + raw.trim();
      open = lastBullet;
    } else {
      const block = { type: 'paragraph' as const, text: raw.trim() };
      push(block);
      open = block;
      lastBullet = null;
    }
  }

  return blocks
    .map((b) => (b.type === 'code' ? b : { ...b, text: stripInline(b.text) }))
    .filter((b) => b.text !== '');
}
