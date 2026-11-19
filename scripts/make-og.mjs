#!/usr/bin/env node
/**
 * Generates the Open Graph images in public/og/ and public/apple-touch-icon.png.
 *
 * The cards are rendered in a real browser against the preview server, so they
 * use the site's actual self-hosted fonts (Press Start 2P, Space Grotesk)
 * rather than approximating them with system fonts. The font files are
 * content-hashed, so the @font-face rules are lifted off a built page instead
 * of being hardcoded.
 *
 * The PNGs are committed. CI does not run this — a different machine would
 * render different typography.
 *
 *   npm run build && npm run og
 *
 * PRIVACY: never render a phone number or address into these images. They are
 * published and read by link-preview crawlers. See AGENTS.md.
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const PORT = 4330;
const ORIGIN = `http://localhost:${PORT}`;
const W = 1200;
const H = 630;

// Light-theme tokens from src/styles/global.css.
const T = {
  paper: '#fff6e9',
  sunken: '#fbebd6',
  ink: '#1b1033',
  inkMuted: '#4a3a6b',
  rule: '#e6d4ba',
  accent: '#c2185b',
  accentOn: '#ffffff',
  violet: '#6d28d9',
  lime: '#3c7a14',
};

const PAGES = [
  {
    file: 'default.png',
    label: null,
    headline: 'Six years shipping mobile and growth products. Now building applied AI, end to end.',
  },
  { file: 'about.png', label: 'About', headline: 'Mobile, platform and growth engineering. MBA + MS in AI/ML at Columbia.' },
  { file: 'projects.png', label: 'Projects', headline: 'AI projects with a live version you can run in the browser.' },
  { file: 'now.png', label: 'Now', headline: "What I'm working on right now. Updated monthly." },
];

/** Start `astro preview` on a private port and wait for it to answer. */
async function startPreview() {
  const proc = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], {
    stdio: 'ignore',
    detached: false,
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${ORIGIN}/`);
      if (res.ok) return proc;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error(`preview server did not start on ${PORT} — run \`npm run build\` first`);
}

function cardHtml({ label, headline }, fontCss, photoDataUri) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
* { margin: 0; box-sizing: border-box; }
body {
  width: ${W}px; height: ${H}px; overflow: hidden;
  background: ${T.sunken};
  font-family: var(--font-sans), system-ui, sans-serif;
  color: ${T.ink};
  position: relative;
}
.grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(${T.rule} 2px, transparent 2px),
    linear-gradient(90deg, ${T.rule} 2px, transparent 2px);
  background-size: 44px 44px;
  opacity: .6;
}
.inner { position: relative; padding: 56px 60px; height: 100%; display: flex; flex-direction: column; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 40px; }
.name {
  font-family: var(--font-pixel), monospace; font-size: 58px; line-height: 1.1;
  text-transform: uppercase; text-shadow: 5px 5px 0 ${T.accent};
}
.role {
  font-family: var(--font-pixel), monospace; font-size: 15px; letter-spacing: .06em;
  text-transform: uppercase; color: ${T.violet}; margin-top: 22px;
}
.headline { font-size: 38px; font-weight: 700; line-height: 1.22; letter-spacing: -.02em; max-width: 700px; margin-top: 40px; }
.photo { width: 196px; height: 196px; flex: none; border: 4px solid ${T.ink}; box-shadow: 10px 10px 0 ${T.accent}; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.label {
  font-family: var(--font-pixel), monospace; font-size: 15px; letter-spacing: .14em;
  text-transform: uppercase; color: ${T.accent}; margin-bottom: 18px;
}
.band {
  position: absolute; left: 0; right: 0; bottom: 0; height: 68px;
  background: ${T.accent}; color: ${T.accentOn};
  border-top: 4px solid ${T.ink};
  display: flex; align-items: center; gap: 30px; padding: 0 60px;
  font-family: var(--font-pixel), monospace; font-size: 15px; letter-spacing: .06em; text-transform: uppercase;
}
.dot { width: 11px; height: 11px; background: currentColor; transform: rotate(45deg); opacity: .8; }
.url { margin-left: auto; opacity: .9; }
</style></head><body>
<div class="grid"></div>
<div class="inner">
  <div class="top">
    <div>
      ${label ? `<div class="label">${label}</div>` : ''}
      <div class="name">Rohun Dhar</div>
      <div class="role">Full-stack applied AI engineer</div>
    </div>
    <div class="photo"><img src="${photoDataUri}" alt=""></div>
  </div>
  <div class="headline">${headline}</div>
</div>
<div class="band">
  <span>Engineer</span><span class="dot"></span>
  <span>Entrepreneur</span><span class="dot"></span>
  <span>Musician</span>
  <span class="url">rohundhar.github.io</span>
</div>
</body></html>`;
}

const preview = await startPreview();
const browser = await chromium.launch();

try {
  const photo = await readFile(new URL('../src/assets/profile.jpeg', import.meta.url));
  const photoDataUri = `data:image/jpeg;base64,${photo.toString('base64')}`;

  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });

  // Lift the generated @font-face rules (and the --font-* variables) off the
  // built page, so the cards use the real, hashed font files.
  const fontCss = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('style')]
      .map((s) => s.textContent ?? '')
      .filter((t) => t.includes('@font-face'));
    return blocks.join('\n');
  });

  if (!fontCss.includes('@font-face')) {
    throw new Error('could not find @font-face rules on the built page');
  }

  await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });

  for (const spec of PAGES) {
    await page.setContent(cardHtml(spec, fontCss, photoDataUri), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
    const png = await sharp(buf).png({ compressionLevel: 9, palette: true }).toBuffer();
    await writeFile(new URL(`../public/og/${spec.file}`, import.meta.url), png);
    console.log(`  og/${spec.file.padEnd(14)} ${(png.length / 1024).toFixed(1)} KB`);
  }

  // Touch icon: the RD monogram plate.
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="${T.ink}"/>
    <text x="32" y="34" fill="${T.paper}" font-family="Courier New, monospace" font-size="24"
          font-weight="700" text-anchor="middle" dominant-baseline="central">RD</text>
  </svg>`;
  const iconPng = await sharp(Buffer.from(icon)).resize(180, 180).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), iconPng);
  console.log(`  apple-touch-icon.png  ${(iconPng.length / 1024).toFixed(1)} KB`);
} finally {
  await browser.close();
  preview.kill();
}
