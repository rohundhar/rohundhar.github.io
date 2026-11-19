#!/usr/bin/env node
/**
 * Verifies the colour tokens in src/styles/global.css meet WCAG 2.2 AA.
 *
 * AA thresholds: 4.5:1 for normal text, 3:1 for large text (>=24px or
 * >=18.66px bold) and for non-text UI boundaries such as hairlines and
 * focus rings.
 *
 * Run: npm run contrast-check
 */

import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/** Pull `--token: #hex;` pairs out of a CSS block. */
function tokensIn(block) {
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

/** The first `:root {...}` block is the light theme; `[data-theme='dark']` is dark. */
function block(startRe) {
  const i = CSS.search(startRe);
  if (i === -1) throw new Error(`block not found: ${startRe}`);
  const open = CSS.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < CSS.length; j++) {
    if (CSS[j] === '{') depth++;
    else if (CSS[j] === '}') {
      depth--;
      if (depth === 0) return CSS.slice(open, j);
    }
  }
  throw new Error('unbalanced braces');
}

const light = tokensIn(block(/:root\s*\{/));
const dark = tokensIn(block(/:root\[data-theme='dark'\]\s*\{/));

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** [foreground token, background token, minimum ratio, what it is] */
const PAIRS = [
  ['--ink', '--paper', 4.5, 'body text on page'],
  ['--ink', '--surface', 4.5, 'body text on card'],
  ['--ink', '--surface-sunken', 4.5, 'body text on sunken panel'],
  ['--ink-muted', '--paper', 4.5, 'muted/lede text on page'],
  ['--ink-muted', '--surface', 4.5, 'muted text on card'],
  ['--ink-muted', '--surface-sunken', 4.5, 'chip text on chip background'],
  ['--ink-faint', '--paper', 4.5, 'eyebrow/meta text on page'],
  ['--ink-faint', '--surface', 4.5, 'meta text on card'],
  ['--accent', '--paper', 4.5, 'link text on page'],
  ['--accent', '--surface', 4.5, 'link text on card'],
  ['--accent', '--surface-sunken', 4.5, 'link text on sunken panel'],
  ['--accent-strong', '--paper', 4.5, 'link hover on page'],
  ['--accent-on', '--accent', 4.5, 'primary button label'],
  ['--accent', '--accent-wash', 4.5, 'accent text on accent wash'],
  ['--accent', '--paper', 3, 'focus ring against page'],
  ['--accent', '--surface', 3, 'focus ring against card'],
  // --rule and --rule-strong are decorative separators and card edges, which
  // SC 1.4.11 does not cover. --border-control is the visible boundary of an
  // interactive control, so it does need 3:1.
  ['--border-control', '--paper', 3, 'ghost button border on page'],
  ['--border-control', '--surface', 3, 'control border on card'],
  // Arcade palette: each colour is used as text on the page and on cards,
  // and as a heading/stat colour, so all of it needs the text threshold.
  ['--c-pink', '--paper', 4.5, 'pink on page'],
  ['--c-cyan', '--paper', 4.5, 'cyan on page'],
  ['--c-gold', '--paper', 4.5, 'gold on page'],
  ['--c-lime', '--paper', 4.5, 'lime on page'],
  ['--c-violet', '--paper', 4.5, 'violet on page'],
  ['--c-pink', '--surface', 4.5, 'pink on card'],
  ['--c-cyan', '--surface', 4.5, 'cyan on card'],
  ['--c-gold', '--surface', 4.5, 'gold on card'],
  ['--c-lime', '--surface', 4.5, 'lime on card'],
  ['--c-violet', '--surface', 4.5, 'violet on card'],
  ['--c-pink', '--c-pink-wash', 4.5, 'pink on its wash'],
  ['--c-cyan', '--c-cyan-wash', 4.5, 'cyan on its wash'],
  ['--c-gold', '--c-gold-wash', 4.5, 'gold on its wash'],
  ['--c-lime', '--c-lime-wash', 4.5, 'lime on its wash'],
  ['--c-violet', '--c-violet-wash', 4.5, 'violet on its wash'],
  ['--ink', '--c-pink-wash', 4.5, 'ink on pink wash'],
  ['--ink', '--c-cyan-wash', 4.5, 'ink on cyan wash'],
  ['--ink', '--c-gold-wash', 4.5, 'ink on gold wash'],
  ['--ink', '--c-lime-wash', 4.5, 'ink on lime wash'],
  ['--ink', '--c-violet-wash', 4.5, 'ink on violet wash'],
  ['--focus', '--paper', 3, 'focus ring on page'],
  ['--focus', '--surface', 3, 'focus ring on card'],
  ['--mode-embedded', '--mode-embedded-wash', 4.5, 'Embedded badge'],
  ['--mode-demo', '--mode-demo-wash', 4.5, 'Demo badge'],
  ['--mode-live', '--mode-live-wash', 4.5, 'Live app badge'],
  ['--mode-case', '--mode-case-wash', 4.5, 'Case study badge'],
  ['--mode-embedded', '--paper', 3, 'Embedded badge border on page'],
  ['--mode-demo', '--paper', 3, 'Demo badge border on page'],
  ['--mode-live', '--paper', 3, 'Live badge border on page'],
  ['--mode-case', '--paper', 3, 'Case study badge border on page'],
];

let failures = 0;
let checked = 0;

for (const [themeName, tokens] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`\n  ${themeName} theme`);
  console.log('  ' + '-'.repeat(68));
  for (const [fg, bg, min, label] of PAIRS) {
    const fgHex = tokens[fg];
    const bgHex = tokens[bg];
    if (!fgHex || !bgHex) {
      console.log(`  MISSING  ${fg} on ${bg} — token not defined in ${themeName}`);
      failures++;
      continue;
    }
    const r = ratio(fgHex, bgHex);
    const pass = r >= min;
    checked++;
    if (!pass) failures++;
    const mark = pass ? 'pass' : 'FAIL';
    console.log(
      `  ${mark}  ${r.toFixed(2).padStart(5)}:1  (needs ${min})  ${label}` +
        (pass ? '' : `  [${fg} ${fgHex} on ${bg} ${bgHex}]`)
    );
  }
}

console.log(`\n  ${checked} pairs checked, ${failures} failing\n`);

if (failures > 0) {
  console.error(`Contrast check failed: ${failures} token pair(s) below WCAG 2.2 AA.`);
  process.exit(1);
}
console.log('All token pairs meet WCAG 2.2 AA.');
