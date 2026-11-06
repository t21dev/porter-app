// Renders public/og.png (1200x630) from an SVG with resvg: the headline and
// the real app screenshot. Run `npm run og` after a release.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import wawoff2 from "wawoff2";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url);
const release = JSON.parse(await readFile(new URL("src/release.json", root), "utf8"));

// resvg needs TTF; fontsource ships WOFF2.
const dir = join(tmpdir(), "porter-og-fonts");
await mkdir(dir, { recursive: true });
const fonts = [];
for (const f of [
  "geist/files/geist-latin-500-normal",
  "geist-mono/files/geist-mono-latin-500-normal",
  "geist/files/geist-latin-600-normal",
  "geist-mono/files/geist-mono-latin-400-normal",
]) {
  const src = require.resolve(`@fontsource/${f}.woff2`);
  const out = join(dir, f.split("/").pop() + ".ttf");
  await writeFile(out, await wawoff2.decompress(await readFile(src)));
  fonts.push(out);
}

const shot = (await readFile(new URL("scripts/assets/og-shot.jpg", root))).toString("base64");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <clipPath id="c"><rect x="760" y="70" width="380" height="600" rx="16"/></clipPath>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#0d0d0d" stop-opacity="0"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0d0d0d"/>
  <image x="760" y="70" width="380" height="488" clip-path="url(#c)" xlink:href="data:image/jpeg;base64,${shot}" preserveAspectRatio="xMidYMin slice"/>
  <rect x="760" y="70" width="380" height="600" rx="16" fill="none" stroke="#ffffff" stroke-opacity="0.08"/>
  <rect x="740" y="380" width="440" height="250" fill="url(#fade)"/>
  <rect x="70" y="70" width="40" height="40" rx="10" fill="#131313" stroke="#2a2a2a"/>
  <path d="M104 90h-7l-5 15-9-30-5 15h-7" fill="none" stroke="#ededed" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="126" y="99" font-family="Geist" font-weight="600" font-size="28" fill="#ededed">Porter</text>
  <circle cx="232" cy="90" r="4" fill="#4dc78e"/><text x="244" y="97" font-family="Geist" font-weight="500" font-size="20" fill="#949494">Live</text>
  <text font-family="Geist" font-weight="600" font-size="96" fill="#ededed" letter-spacing="-4">
    <tspan x="64" y="290">What’s on</tspan>
    <tspan x="64" y="390">port <tspan fill="#f7b23b" font-family="Geist Mono" font-weight="500" letter-spacing="-6">3000</tspan>?</tspan>
  </text>
  <text font-family="Geist" font-weight="500" font-size="28" fill="#949494">
    <tspan x="68" y="470">See which process holds a port,</tspan>
    <tspan x="68" y="508">and stop it in one click.</tspan>
  </text>
  <text x="68" y="590" font-family="Geist Mono" font-size="19" fill="#949494">porter.t21.dev · Windows · macOS · Linux</text>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Geist" },
})
  .render()
  .asPng();
await writeFile(new URL("public/og.png", root), png);
console.log(`og: public/og.png (${(png.length / 1024).toFixed(0)} KB)`);
