// Checks that `cn` (src/lib/utils.ts) merges Porter's own class combinations
// the way the components expect. Run: npm run check:cn (Node 22.6 or newer).
import { cn } from '../src/lib/utils.ts';

const cases: [unknown[], string][] = [
  // Token colours replace each other; arbitrary pixel sizes are font sizes, not colours.
  [['text-subtle', 'text-foreground'], 'text-foreground'],
  [['text-[12px]', 'text-foreground'], 'text-[12px] text-foreground'],
  [['text-[12px] text-muted-foreground', 'text-[13px]'], 'text-muted-foreground text-[13px]'],
  [['text-[10.5px] text-free', 'text-occupied'], 'text-[10.5px] text-occupied'],
  // Status colours with opacity modifiers.
  [['text-free bg-free/10', 'text-occupied bg-occupied/10'], 'text-occupied bg-occupied/10'],
  [['bg-occupied/6', 'bg-system'], 'bg-system'],
  [['border border-free/25', 'border-border'], 'border border-border'],
  [['bg-free/10', 'hover:bg-free/15'], 'bg-free/10 hover:bg-free/15'],
  [['h-1.5 w-1.5 rounded-full border border-system', cn('bg-system', 'scale-100')], 'h-1.5 w-1.5 rounded-full border border-system bg-system scale-100'],
  // Component overrides: Button variants, AlertDialogAction, DialogContent, DialogHeader.
  [['bg-primary text-primary-foreground hover:bg-primary/85', 'bg-destructive text-destructive-foreground hover:bg-destructive/90'], 'bg-destructive text-destructive-foreground hover:bg-destructive/90'],
  [['max-w-md gap-5 rounded-xl p-6', 'max-w-sm gap-0 p-0'], 'rounded-xl max-w-sm gap-0 p-0'],
  [['flex flex-col space-y-1.5 text-left', 'space-y-0 px-6 pb-5 pt-6'], 'flex flex-col text-left space-y-0 px-6 pb-5 pt-6'],
  [['h-8 w-8', 'h-7 rounded px-2 text-xs'], 'w-8 h-7 rounded px-2 text-xs'],
  // Radii, easing and the float shadow from the design tokens.
  [['rounded-md', 'rounded-[5px]'], 'rounded-[5px]'],
  [['rounded-xl', 'rounded-b-xl'], 'rounded-xl rounded-b-xl'],
  [['ease-out duration-150', 'ease-in-out duration-300'], 'ease-in-out duration-300'],
  [['shadow-float', 'rounded-xl'], 'shadow-float rounded-xl'],
  // Custom and tw-animate-css classes pass through untouched.
  [['font-mono tabular', 'reveal'], 'font-mono tabular reveal'],
  [['animate-in fade-in-0 zoom-in-[0.97] duration-200', 'animation-duration-150'], 'animate-in fade-in-0 zoom-in-[0.97] duration-200 animation-duration-150'],
  // Tailwind v4 syntax.
  [['origin-(--radix-dropdown-menu-content-transform-origin)', 'origin-left'], 'origin-left'],
  [['outline-hidden', 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'], 'outline-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'],
  // clsx-style arguments.
  [['a-1', false, { 'b-1': true, 'c-1': false }, ['d-1', ['e-1']], null, undefined, 0], 'a-1 b-1 d-1 e-1'],
];

let failed = 0;
for (const [args, expected] of cases) {
  const got = cn(...(args as Parameters<typeof cn>));
  if (got !== expected) {
    failed++;
    console.error(`FAIL cn(${args.map((a) => JSON.stringify(a)).join(', ')})\n  expected: ${expected}\n  got:      ${got}`);
  }
}
console.log(failed ? `${failed} of ${cases.length} cases failed` : `all ${cases.length} cn cases pass`);
process.exit(failed ? 1 : 0);
