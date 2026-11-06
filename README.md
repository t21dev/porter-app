# Porter website

This is the `landing` branch of [t21dev/porter-app](https://github.com/t21dev/porter-app). It holds **only** the website at <https://porter.t21.dev>. The app lives on `main`.

This branch is an orphan. Never merge it with `main`.

## Stack

- React 19 + TypeScript + Vite, prerendered to static HTML at build time (`src/entry-server.tsx` → `scripts/prerender.mjs`), then hydrated.
- Plain CSS with tokens in `src/styles/tokens.css`, taken from the app's dark theme and status colours in `DESIGN.md` on `main`. Geist and Geist Mono are bundled, so the page makes no third-party requests.
- Cloudflare Workers static assets (`wrangler.jsonc`), custom domain `porter.t21.dev`.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # fetch latest release, typecheck, build, prerender
npm run check     # verify SEO tags, OG image, sitemap, alt text in dist/
npm run og        # re-render public/og.png from the release data
npm run deploy    # build and `wrangler deploy` (needs `wrangler login`)
```

## Content that comes from the app

- **Release data.** `scripts/release.mjs` asks the GitHub API for the latest release at build time and writes `src/release.json`: the version, date, and every download link and size. If GitHub is unreachable, the committed `release.json` is used.
- **Demo data.** The hero's live board uses the pinned list from the app screenshot (`src/content.ts`, `DEMO`). It runs in the page only; nothing touches the visitor's ports.
- **Copy.** Features, default ports and the Docker notes come from the README on `main`. Do not add a claim or a number that is not there.
- **Screenshots.** `public/screenshots/{dark,light}.webp` are WebP copies of `screenshot.png` and `screenshot-light.png` on `main`, plus 600px versions. When those change, re-export them:
  `ffmpeg -i screenshot.png -c:v libwebp -quality 86 dark.webp`

## Deploying

Workers Builds: connect this repository, set the production branch to `landing`, build command `npm run build`, deploy command `npx wrangler deploy`. A push here deploys. Re-run the build after each app release so the version and download links update (or trigger a deploy hook from the release workflow on `main`).

## SEO

`index.html` carries the title, description, canonical, Open Graph and Twitter tags and a JSON-LD `SoftwareApplication`; `scripts/prerender.mjs` fills in the version and size, and writes `404.html` and `sitemap.xml`. `public/robots.txt` points at the sitemap. `npm run check` fails if any of that is missing.
