# Porter design system

This document records how Porter's interface is built today, so new UI matches it. Every value here is taken from the code; file:line references point at the reference implementation. If the code and this file disagree, fix one of them in the same change.

The header comment in `src/index.css:1-4` states the intent: "quiet instrument panel, ink on near-black", no brand accent, status hues used only as signals, Geist and Geist Mono, motion on transform and opacity only with an ease-out-expo curve.

## Principles

These are inferred from consistent patterns across the code, not aspirations.

1. **Neutral surfaces, colour only for status.** All surfaces, text and controls are pure greys (hue 0, saturation 0). The only chromatic colours are the three port statuses and `destructive`. There is no accent colour; the "primary" button is foreground ink.
2. **Dense and quiet.** Small type (11 to 13px), 48px rows, thin 1px borders, almost no shadows. Secondary controls (pin, kill, sort arrows) stay faint or hidden until hover or focus (`PortListItem.tsx:102-115`).
3. **Numbers are monospaced and tabular.** Port numbers, PIDs, counts and versions use `font-mono tabular` everywhere.
4. **Live data must not move under the pointer.** The Other ports table freezes its order while hovered (`OtherPortsList.tsx:68-72`). Respect this in any new live list.
5. **Motion is short, eased and optional.** Everything has a reduced-motion path.

## Colour tokens

Tokens are HSL triplets (no `hsl()` wrapper) defined in `src/index.css`, light in `:root` (lines 13-43) and dark in `.dark` (lines 45-70). Tailwind exposes them as `hsl(var(--token))` in `tailwind.config.js:16-55`, so opacity modifiers work (`bg-free/10`, `border-border/70`). Hex values below are conversions for reference only; never paste them into components.

### Light theme (`:root`)

| Token | HSL | Approx. hex | Use |
|---|---|---|---|
| `--background` | 0 0% 98.4% | #fbfbfb | App canvas, sticky headers, inset wells inside popovers |
| `--foreground` | 0 0% 9% | #171717 | Primary text, port numbers, process names |
| `--card` | 0 0% 100% | #ffffff | List surfaces, stats panel, inputs, segmented controls |
| `--popover` | 0 0% 100% | #ffffff | Dialogs, dropdowns, toasts |
| `--elevated` | 0 0% 94.5% | #f1f1f1 | Active segment fill, switch track (off), skeleton bars, progress track |
| `--primary` | 0 0% 9% | #171717 | Default button fill (ink) |
| `--primary-foreground` | 0 0% 98% | #fafafa | Text on primary |
| `--secondary` / `--muted` | 0 0% 95% | #f2f2f2 | Rarely used (toast action hover, dropdown separator) |
| `--muted-foreground` | 0 0% 40% | #666666 | Secondary text, labels, descriptions |
| `--subtle` | 0 0% 58% | #949494 | Tertiary text: counts, PIDs, icons at rest, placeholders |
| `--accent` | 0 0% 95.5% | #f4f4f4 | Hover background for rows and ghost buttons |
| `--destructive` | 0 72% 50% | #db2424 | Kill, remove, error toasts |
| `--border` | 0 0% 90% | #e6e6e6 | All borders and dividers (applied globally, `index.css:74-76`) |
| `--input` | 0 0% 88% | #e0e0e0 | Hover border on inputs and outline buttons |
| `--ring` | 0 0% 45% | #737373 | Focus rings, used at /50 or /60 |
| `--free` | 152 62% 36% | #239560 | Status: free |
| `--occupied` | 32 92% 44% | #d77709 | Status: occupied, warnings |
| `--system` | 215 78% 50% | #1c6fe3 | Status: system |

### Dark theme (`.dark`)

| Token | HSL | Approx. hex | Use |
|---|---|---|---|
| `--background` | 0 0% 5.1% | #0d0d0d | App canvas |
| `--foreground` | 0 0% 93% | #ededed | Primary text |
| `--card` | 0 0% 7.3% | #131313 | List surfaces, inputs |
| `--popover` | 0 0% 8.6% | #161616 | Dialogs, dropdowns, toasts |
| `--elevated` | 0 0% 12% | #1f1f1f | Active segment, switch track, skeletons |
| `--primary` | 0 0% 93% | #ededed | Default button fill |
| `--primary-foreground` | 0 0% 6% | #0f0f0f | Text on primary |
| `--secondary` / `--muted` | 0 0% 11% | #1c1c1c | Rarely used |
| `--muted-foreground` | 0 0% 58% | #949494 | Secondary text |
| `--subtle` | 0 0% 40% | #666666 | Tertiary text and icons |
| `--accent` | 0 0% 10.5% | #1b1b1b | Hover background |
| `--destructive` | 0 75% 62% | #e75555 | Destructive actions |
| `--border` | 0 0% 12.5% | #202020 | Borders and dividers |
| `--input` | 0 0% 15% | #262626 | Input hover border |
| `--ring` | 0 0% 55% | #8c8c8c | Focus rings |
| `--free` | 152 52% 54% | #4dc78e | Status: free |
| `--occupied` | 38 92% 60% | #f7b23b | Status: occupied, warnings |
| `--system` | 215 90% 68% | #64a1f7 | Status: system |

Note the surface ladder in dark mode: background 5.1% < card 7.3% < popover 8.6% < accent 10.5% < elevated 12% < border 12.5%. Layering is done by lightness steps, not shadows. In light mode `muted-foreground` and `subtle` swap values with dark mode (40% and 58%).

Other non-colour tokens in `:root`: `--radius: 0.625rem` and the three easing curves (see Motion).

## Status colours and their meaning

| Status | Token | Meaning | Labels in UI |
|---|---|---|---|
| free | `free` (green) | Port is not bound. Pinned ports that are not running are shown as free placeholders (`App.tsx:92-99`) | "Free" |
| occupied | `occupied` (amber) | A user process holds the port; it can be killed | "Occupied" in stats and filter, "In use" on row pills (`PortListItem.tsx:32`) |
| system | `system` (blue) | Held by the OS; no kill action | "System" |

How status colour is applied, from `PortListItem.tsx:30-34` and `StatusFilter.tsx:8-12`:

- Dot: `h-1.5 w-1.5 rounded-full bg-{status}`. Occupied rows add a blurred halo behind the dot (`PortListItem.tsx:52-54`).
- Pill: `rounded-full px-2 py-0.5 text-[10.5px] font-medium text-{status} bg-{status}/10`.
- Filter dot (inactive): `border-{status} bg-transparent scale-90`.
- Distribution bar: segments `bg-{status} opacity-80` on a `bg-border/60` 3px track (`StatsCard.tsx:60-75`).

Status colours carry secondary meanings: `occupied` is the warning colour (admin banner `AdminWarning.tsx:33`, pinned-ports capacity full `PortSettings.tsx:213`); `free` is the positive colour (Live dot `TitleBar.tsx:43-46`, update available `UpdateNotice.tsx:28`, "up to date" check `AboutDialog.tsx:124`). Do not introduce new hues for success or warning; reuse these. `destructive` is reserved for kill and remove actions and error toasts, never for a port status.

## Typography

- **Families** (`tailwind.config.js:12-15`): `font-sans` is Geist Variable, `font-mono` is Geist Mono Variable, both bundled via `@fontsource-variable` (`index.css:5-6`). No web font requests.
- **Body** (`index.css:81-88`): `antialiased`, `font-feature-settings: "rlig" 1, "calt" 1, "ss01" 1`, `user-select: none` on the body (inputs re-enable it).
- **Sizes** are arbitrary pixel values, not the Tailwind scale. The set in use:

| Size | Weight | Where |
|---|---|---|
| 26px mono, `leading-none tracking-[-0.03em]` | medium | Stat counters (`StatsCard.tsx:28`) |
| 17px | semibold | About dialog title (`AboutDialog.tsx:30`) |
| 15px, `tracking-[-0.01em]` | semibold | Dialog titles (`dialog.tsx:89`, `alert-dialog.tsx:78`) |
| 14px mono, `tracking-[-0.02em]` | medium | Port number in rows (`PortListItem.tsx:59`) |
| 13px | semibold / medium / regular | Settings headings, wordmark, button text, input text, dialog body |
| 12.5px | medium / regular | Process names, service labels, banner text |
| 12px | medium / regular | Section labels, setting descriptions, filter segments, toast description |
| 11.5px | medium | Stat labels, segmented toggles, small text buttons, hints |
| 11px | regular / medium | Mono counts and PIDs, sort headers, footnotes |
| 10.5px | medium | Status pills |
| 10px mono | regular | `kbd` hint (`SearchBar.tsx:64`) |

- Weights: 400, 500 (`font-medium`, the default for labels and controls), 600 (`font-semibold`, headings only). No bold.
- Numbers: always `font-mono tabular` (`.tabular` utility, `index.css:98-100`). Inputs that take numbers use `font-mono tabular placeholder:font-sans` (`SearchBar.tsx:48`, `PortSettings.tsx:166`).
- Headings and labels are sentence case ("Only show pinned ports", "Kill process?"). No uppercase labels in current UI.

## Spacing and layout

- Fixed width window: 700px logical, min height 640px, frameless (`src-tauri/tauri.conf.json:18-24`). The interface size setting zooms the webview to 0.9, 1, 1.15 or 1.3 and resizes the window to match (`uiScaleStore.ts:6-11`); design at 1.0 and keep layout relative so all four presets hold.
- Page gutter: `px-5`; top section `pt-5 pb-4 space-y-3`; list bottom `pb-8` (`App.tsx:227`, `App.tsx:241`).
- Title bar: `h-12`, `pl-4`, or `pl-[84px]` on macOS for the traffic lights (`TitleBar.tsx:31-33`).
- Rows: `h-12 px-3.5 gap-3`; group rows `h-10`; table header `h-9` (`PortListItem.tsx:47`, `OtherPortsList.tsx:299`, `OtherPortsList.tsx:252`).
- Row columns have fixed widths so headers align: dot `w-2`, port `w-[52px]`, service `w-[118px]`, process `flex-1`, then `w-7` slots for pin and kill (`OtherPortsList.tsx:253-284`).
- Control heights: 36px (`h-9`) for primary inputs and the status filter; 32px (`h-8`) for icon buttons, small buttons and the settings input; 28px (`h-7`) for inline row actions and small pills; 20px (`h-5`) for the clear button and the switch.
- Panel padding: dialogs `p-6`; settings sections `px-4 py-3.5`; stat cells `px-4 py-3.5`.
- Section label to list: `mb-2`; between sections: `mt-5`.
- Scrolling uses SimpleBar with a 4px thumb at 14% foreground opacity, 26% on track hover (`index.css:175-194`). Use it for any new scroll region in the main view.

## Shape and borders

- `--radius` is 10px. Tailwind maps `rounded-xl` 14px, `rounded-lg` 10px, `rounded-md` 8px, `rounded-sm` 6px (`tailwind.config.js:56-61`).
- `rounded-xl`: list surfaces, stats panel, dialogs, dropdowns, toasts, empty states. `rounded-lg`: inputs, segmented control containers, banners, inset wells. `rounded-md`: buttons, segments, chips. `rounded-full`: dots, pills, switches. `rounded` (4px): `kbd` and the tiny clear button. `rounded-[5px]`: segments inside the 28px toggle (`OtherPortsList.tsx:222`).
- Borders are always 1px `border-border`. Lists divide rows with `divide-y divide-border` (`App.tsx:362`). The title bar uses `border-border/70`. Empty states use `border-dashed`.
- Shadows: only `shadow-float` on floating layers (dialogs, dropdowns, toasts) (`tailwind.config.js:67-69`). In-flow surfaces have no shadow.
- Backdrops: title bar `bg-background/80 backdrop-blur-md`; modal overlay `bg-black/55 backdrop-blur-[2px]`.

## Iconography

- Library: `lucide-react` (`components.json:13`). Window controls and the Porter mark are hand-drawn inline SVGs (`TitleBar.tsx:56-80`, `TitleBar.tsx:119-136`).
- Sizes: 15px (`h-[15px] w-[15px]`) in title bar buttons and the search field; 14px (`h-3.5 w-3.5`) for row actions, service icons and icons inside buttons; 16px (`h-4 w-4`) for dialog close and the admin banner; 12px (`h-3 w-3`) for sort arrows, pause and the pinned glyph.
- Stroke: lucide default 2; service icons and the banner icon use `strokeWidth={1.75}`. Icons at rest are `text-subtle` and go to `text-foreground` on hover.
- Service icons come from `src/lib/portTypes.ts` (Globe, Database, Server, Code, Package, FileCode as fallback) and render in `text-subtle`, not in brand colours.

## Motion

- Easing tokens (`index.css:40-42`, exposed as `ease-out`, `ease-in`, `ease-in-out` in `tailwind.config.js:62-66`): out `cubic-bezier(0.16, 1, 0.3, 1)` (expo), in `cubic-bezier(0.7, 0, 0.84, 0)`, in-out `cubic-bezier(0.65, 0, 0.35, 1)`. The `ease-out` class resolves to the token, not Tailwind's default curve.
- Durations: 150ms for hover colour changes; 200ms for toggles and switches; 300ms for icon swaps, chevrons and toasts; 420ms for entrances; 600ms for the counter; 900ms for one-shot pulses.
- Entrance: `.reveal` fades in and rises 6px over 420ms, staggered 28ms per `--i` set inline and capped (rows cap at 14, `PortListItem.tsx:48`) (`index.css:103-106`).
- Expand and collapse: `.collapse-grid` with `data-open`, animating `grid-template-rows` rather than height (`index.css:109-124`, used at `App.tsx:323-326`).
- Press feedback: `active:scale-[0.97]` on buttons, `active:scale-90` on icon-only row actions, `active:scale-[0.96]` on filter segments.
- Live signals: `ping-once` on the Live dot each time data lands (`TitleBar.tsx:41-45`); `grow-x` on the distribution bar; `shimmer` on skeleton rows (`PortScanLoader.tsx:17-20`); stat numbers ease with a quartic curve (`src/hooks/useCountUp.ts`).
- Theme change crossfades via the View Transitions API at 260ms (`index.css:168-172`, `themeStore.ts:27-37`); the sun and moon icons rotate and scale (`Header.tsx:46-57`).
- Popovers use `tailwindcss-animate`: fade plus `zoom-in-[0.97]`.
- Reduced motion: all animations and transitions clamp to 150ms with no delay and `.reveal` becomes a fade (`index.css:196-211`); the theme transition and counters skip animation entirely.

## Components

Reuse these class patterns. Copy from the referenced line rather than retyping.

- **Button** (`src/components/ui/button.tsx:13-31`): variants `default` (ink), `destructive`, `outline` (`border-border bg-card`), `ghost` (`text-muted-foreground hover:bg-accent hover:text-foreground`). Sizes `default` h-9 13px, `sm` h-8 13px, `icon` h-8 w-8, `xs` h-7. Title bar actions are `variant="ghost" size="icon"` with a 15px icon plus `aria-label` and `title` (`Header.tsx:24-36`).
- **Small text button** (no component): `rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground` (`PortSettings.tsx:150`).
- **Input** (`src/components/ui/input.tsx:12-17`): `h-9 rounded-lg border-border bg-card px-3 text-[13px]`, hover `border-input`, focus `border-ring/60 bg-background` (border change, no ring), number spinners hidden.
- **Search field** (`SearchBar.tsx:34-67`): leading 15px icon at `left-3`, `pl-9 pr-10`, `/` shortcut shown as a `kbd` that fades on focus, a clear button replaces it when there is a value, Escape clears.
- **Segmented control** (`StatusFilter.tsx:20-35`, `OtherPortsList.tsx:205-227`, `PortSettings.tsx:71-89`): container `rounded-lg border border-border bg-card p-[3px] gap-0.5`; active segment `bg-elevated text-foreground`, inactive `text-subtle hover:text-muted-foreground`. Use `aria-pressed` for multi-select; `role="radiogroup"` and `role="radio"` with `aria-checked` for single-select.
- **Switch** (`PortSettings.tsx:228-250`): `h-5 w-9 rounded-full border`. On: `border-foreground/60 bg-foreground/80` with a `bg-background` thumb. Off: `border-border bg-elevated` with a `bg-muted-foreground` thumb. Thumb `h-3.5 w-3.5`, moves `translate-x-4`. `role="switch"`, `aria-checked`, labelled by the heading id.
- **Settings row** (`PortSettings.tsx:106-117`): `flex items-start justify-between gap-4 px-4 py-3.5`; heading `text-[13px] font-semibold`; description `mt-0.5 text-[12px] text-muted-foreground`; sections separated by `border-t border-border`. The panel is a `DropdownMenuContent` with `w-80 p-0` (`PortSettings.tsx:59`).
- **List surface and port row** (`App.tsx:360-366`, `PortListItem.tsx:45-169`): surface `divide-y divide-border overflow-hidden rounded-xl border border-border bg-card`; row `h-12 px-3.5 gap-3 hover:bg-accent`; hover-revealed action `h-7 w-7 rounded-md text-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100`.
- **Section label** (`App.tsx:350-358`): title `text-[12px] font-medium text-muted-foreground`, count `font-mono text-[11px] text-subtle tabular`.
- **Disclosure divider** (Other ports, `App.tsx:302-321`): label, count, a `h-px flex-1 bg-border` rule, and a rotating `ChevronDown`.
- **Sortable table header** (`OtherPortsList.tsx:252`, `OtherPortsList.tsx:342-379`): `h-9 rounded-t-xl border bg-card`, sticky on a `bg-background` wrapper; header text `text-[11px] font-medium`, active `text-foreground`, arrow hidden until hover.
- **Stats panel** (`StatsCard.tsx:42-77`): one `rounded-xl border bg-card` surface, `grid-cols-3 divide-x`, each cell a dot, a label and a 26px mono number, with a 3px distribution bar at the bottom.
- **Banner** (`AdminWarning.tsx:31-58`): `rounded-lg border border-occupied/20 bg-occupied/[0.06]`, icon `text-occupied`, lead phrase `font-medium text-foreground`, action `text-occupied hover:bg-occupied/10`.
- **Status pill button** (`UpdateNotice.tsx:28`): `h-7 rounded-full border border-free/25 bg-free/10 text-[11.5px] font-medium text-free`.
- **Chip** (`PortSettings.tsx:191-201`): `h-7 rounded-md border border-border bg-background font-mono text-[12px]` with an `h-5 w-5` remove button that turns `hover:bg-destructive/10 hover:text-destructive`.
- **Empty state** (`App.tsx:368-375`): `rounded-xl border border-dashed px-6 py-10 text-center`, title 13px medium, body 12px muted.
- **Skeleton** (`PortScanLoader.tsx:4-25`): mirrors row geometry with `bg-elevated` bars at 100, 70 and 50% opacity and a `via-foreground/[0.035]` shimmer.
- **Dialog and alert dialog** (`dialog.tsx:39`, `alert-dialog.tsx:35`): `max-w-md rounded-xl border bg-popover p-6 gap-5 shadow-float`. Destructive confirms show the target in an inset well (`rounded-lg border bg-background px-3 py-2.5`) and style the action `bg-destructive text-destructive-foreground` (`PortListItem.tsx:139-165`). Footer buttons are right-aligned, cancel first.
- **Dropdown** (`dropdown-menu.tsx:66`): `rounded-xl border bg-popover p-1 shadow-float`.
- **Toast** (`toast.tsx:26-33`): bottom right, max 360px, `rounded-xl border bg-popover shadow-float`. The destructive variant keeps the neutral surface and colours only the title and border.

## Theming rules

1. Every colour goes through a token: `bg-card`, `text-subtle`, `border-border`, `bg-free/10`. No hex, `rgb()`, or Tailwind palette classes (`text-green-500`, `bg-gray-*`) in components.
2. Use opacity modifiers on tokens for tints (`/10` fill, `/20` or `/25` border, `/40` or `/50` focus ring) instead of new tokens.
3. A new semantic colour needs a value in both `:root` and `.dark` in `src/index.css` and an entry in `tailwind.config.js`. Keep greys at hue 0, saturation 0.
4. Dark mode is class based (`darkMode: ["class"]`), toggled on `<html>` by `src/store/themeStore.ts`. Do not use `prefers-color-scheme` media queries or `dark:` overrides for colours a token already covers.
5. Check every new screen in both themes. `screenshot.png` (dark) and `screenshot-light.png` (light) show the reference look.

Known exceptions in the code today: the Windows close button uses the system red `#e81123` / `#c50f1f` with `text-white` (`TitleBar.tsx:110`), modal overlays use `bg-black/55` (`dialog.tsx:22`, `alert-dialog.tsx:17`), and `index.html:2` hardcodes `class="dark"` and `background:#0d0d0d` to avoid a flash before the theme store loads. Treat these as deliberate; do not copy the pattern elsewhere.

## Accessibility

- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50` (`/60` on Button). Destructive and status controls tint the ring (`ring-destructive/40`, `ring-occupied/40`, `ring-free/40`). Never remove focus styling without a replacement.
- Icon-only buttons have an `aria-label` and a `title`. Toggles expose state with `aria-pressed`, `aria-checked`, `aria-expanded` or `aria-sort`.
- Hover-only actions must also appear on keyboard focus (`focus-visible:opacity-100`).
- Status is never colour alone: rows carry a text pill and stats a text label beside every dot.
- Keyboard: `/` focuses search, Escape clears it, Ctrl/Cmd with `=`, `-`, `0` changes interface size.
- Contrast caveats in the current palette: `subtle` text is about 2.9:1 on the light background and 3.2:1 on the dark card; light-mode status pill text (`free`, `occupied` on a /10 tint) is roughly 3 to 3.8:1. Keep `subtle` for non-essential metadata; anything a user must read uses `muted-foreground` (5.5:1 light, 6.1:1 dark) or `foreground`.
- Respect `prefers-reduced-motion`; JavaScript animations must check it as `useCountUp` and `themeStore` do.

## Do and don't

Do:
- Build from `ui/button`, `ui/input`, `ui/dialog`, `ui/alert-dialog`, `ui/dropdown-menu` and the patterns above.
- Put numbers in `font-mono tabular`.
- Group related content on one `bg-card` surface separated by borders and dividers.
- Reveal secondary actions on hover and on focus.
- Use `free`, `occupied`, `system` and `destructive` only for their meanings.

Don't:
- Add an accent or brand colour, gradients, or coloured surfaces beyond `/10` status tints.
- Add shadows to in-flow surfaces (`shadow-sm` in `ui/card.tsx` is legacy).
- Use Tailwind's text size scale (`text-sm`, `text-xs`) in new UI; use the pixel sizes under Typography.
- Animate `height`, `width` or other layout properties; use transform, opacity or `.collapse-grid`.
- Colour service icons by framework.
- Build on the unused legacy files: `src/App.css` (Vite template, never imported), `PortCard.tsx`, `PortGrid.tsx`, `PortDetailModal.tsx`, `Footer.tsx`, `ui/card.tsx`, `ui/badge.tsx`, `ui/alert.tsx`.

## Checklist for new UI

- [ ] Only token colour classes; no hex, `rgb()` or Tailwind palette colours.
- [ ] Looks right in light and dark, and at all four interface sizes.
- [ ] Type sizes and weights come from the Typography table; numbers are mono and tabular.
- [ ] Radius and borders follow Shape and borders; no new shadows on in-flow surfaces.
- [ ] Icons from lucide at 12, 14, 15 or 16px, resting in `text-subtle` or `text-muted-foreground`.
- [ ] Transitions use the token easings and listed durations; reduced motion is handled.
- [ ] Every interactive element has a visible focus ring, an accessible name, and its state in ARIA.
- [ ] Status colours used only for port status, warning (`occupied`) or success (`free`).
