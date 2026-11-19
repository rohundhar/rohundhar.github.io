#!/usr/bin/env node
/**
 * Fails the build if anything in this repo would publish private data.
 *
 * This site is deployed from the repo, so a committed secret or phone number
 * is a published secret or phone number. CI runs this before every build.
 *
 * Covers:
 *   1. Personal contact data  — phone numbers (including inside PDFs),
 *      `tel:` links, street addresses.
 *   2. Credentials            — .env files, API-key-shaped strings.
 *   3. Job-search private data — the CSVs, tracker state and profile files
 *      listed in docs/designdoc.md.
 *   4. Stray PDFs             — only the approved public resume may exist.
 *
 * See AGENTS.md for the full policy. Do not weaken a rule to make a build
 * green; fix the file instead.
 *
 * Run: npm run privacy-check
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import zlib from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.astro',
  'test-results',
  'playwright-report',
  'blob-report',
  '.vercel',
  '.netlify',
]);

/** The only PDF allowed to exist in the repo. */
const ALLOWED_PDF = 'public/resume.pdf';

/**
 * Files that legitimately quote credential prefixes because they document
 * this very policy. Phone and address rules still apply to them.
 */
const SECRET_SCAN_EXEMPT = new Set(['AGENTS.md', 'scripts/privacy-check.mjs', 'docs/designdoc.md']);

/** Extensions worth reading as text. */
const TEXT_EXT = new Set([
  '.astro', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.json', '.md', '.mdx',
  '.yaml', '.yml', '.css', '.scss', '.html', '.txt', '.svg', '.xml', '.toml', '.sh',
]);

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const PHONE_RULES = [
  {
    name: 'phone number (international format)',
    re: /\+\d{1,2}[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,
  },
  {
    name: 'phone number (parenthesised area code)',
    re: /\(\d{3}\)\s?\d{3}[\s.\-]?\d{4}\b/g,
  },
  {
    name: 'phone number (dashed or dotted)',
    re: /\b\d{3}[.\-]\d{3}[.\-]\d{4}\b/g,
  },
];

const TEXT_RULES = [
  ...PHONE_RULES,
  { name: 'tel: link', re: /tel:\+?[\d\s().\-]{7,}/gi },
  {
    name: 'street address',
    re: /\b\d{1,5}\s+[A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*)?\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Parkway|Pkwy)\b\.?/g,
  },
  { name: 'apartment or unit number', re: /\b(?:Apt|Apartment|Unit|Suite|Ste)\.?\s*#?\s*\d+[A-Za-z]?\b/gi },
  { name: 'US state + ZIP code', re: /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g },
];

const SECRET_RULES = [
  { name: 'API key (sk- prefix)', re: /\bsk-[A-Za-z0-9_\-]{20,}/g },
  { name: 'Google API key', re: /\bAIza[A-Za-z0-9_\-]{30,}/g },
  { name: 'Supabase service_role key', re: /service_role/g },
  { name: 'AWS access key id', re: /\bAKIA[A-Z0-9]{16}\b/g },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
];

/** Filenames that must never be committed, as regexes against the repo path. */
const FORBIDDEN_PATHS = [
  { name: 'environment file', re: /(^|\/)\.env(\.|$)(?!example)/ },
  { name: 'job postings CSV', re: /(^|\/)postings[^/]*\.csv$/i },
  { name: 'job tracker state', re: /(^|\/)job_tracker_state[^/]*\.json$/i },
  { name: 'Claude analyses log', re: /(^|\/)analyses\.jsonl$/i },
  { name: 'candidate profile', re: /(^|\/)candidate_profile\.md$/i },
  { name: 'job pipeline data directory', re: /(^|\/)job_pipeline\/data\// },
];

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

/**
 * Pulls readable text out of a PDF without a parser dependency: inflate each
 * stream, then collect the literal strings that text-showing operators use.
 * Good enough to catch a phone number on a resume.
 */
export function extractPdfText(buffer) {
  const raw = buffer.toString('latin1');

  /** How much of a chunk is ordinary printable text. */
  const printableRatio = (s) =>
    (s.match(/[\x20-\x7E\n\r\t]/g) ?? []).length / Math.max(1, s.length);

  // Object definitions outside any stream, plus every stream we can read.
  // Raw compressed bytes are never included: they are binary noise that would
  // both pollute the text and fool the readability gate below.
  const streams = [raw.replace(/stream\r?\n?[\s\S]*?endstream/g, ' ')];

  for (const m of raw.matchAll(/stream\r?\n?([\s\S]*?)endstream/g)) {
    const body = m[1];
    try {
      streams.push(zlib.inflateSync(Buffer.from(body, 'latin1')).toString('latin1'));
    } catch {
      // Not deflate. Keep it only if it is an uncompressed *text* stream,
      // never an embedded image or font.
      if (printableRatio(body) > 0.9) streams.push(body);
    }
  }

  // ---- 1. ToUnicode CMaps -------------------------------------------------
  // Producers like LibreOffice draw text as hex glyph codes (<0024><0048>…)
  // against a subset font, so the literal-string pass below sees nothing.
  // These maps are what turn those codes back into characters.
  const cmap = new Map();
  let codeBytes = 2;

  const utf16 = (hex) => {
    let out = '';
    for (let i = 0; i + 3 < hex.length + 1; i += 4) {
      const cp = parseInt(hex.slice(i, i + 4), 16);
      if (Number.isFinite(cp) && cp !== 0) out += String.fromCharCode(cp);
    }
    return out;
  };

  for (const stream of streams) {
    if (!stream.includes('beginbfchar') && !stream.includes('beginbfrange')) continue;

    for (const block of stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        codeBytes = Math.max(1, Math.ceil(pair[1].length / 2));
        cmap.set(parseInt(pair[1], 16), utf16(pair[2]));
      }
    }

    for (const block of stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      // <lo> <hi> <dstStart>
      for (const r of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const lo = parseInt(r[1], 16);
        const hi = parseInt(r[2], 16);
        const dst = parseInt(r[3], 16);
        codeBytes = Math.max(1, Math.ceil(r[1].length / 2));
        if (hi - lo > 65535) continue;
        for (let c = lo; c <= hi; c++) cmap.set(c, String.fromCharCode(dst + (c - lo)));
      }
      // <lo> <hi> [<d1> <d2> …]
      for (const r of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
        const lo = parseInt(r[1], 16);
        const dsts = [...r[3].matchAll(/<([0-9A-Fa-f]+)>/g)];
        dsts.forEach((d, i) => cmap.set(lo + i, utf16(d[1])));
      }
    }
  }

  // ---- 2. Text ------------------------------------------------------------
  const chunks = [];
  const hexChars = codeBytes * 2;

  for (const stream of streams) {
    // Literal strings: (Rohun Dhar) Tj
    for (const m of stream.matchAll(/\((?:\\.|[^\\()])*\)/g)) chunks.push(m[0].slice(1, -1));

    // Hex strings: <00240048> Tj  — skipping dictionary delimiters.
    if (cmap.size > 0) {
      for (const m of stream.matchAll(/(?<!<)<([0-9A-Fa-f\s]{2,})>(?!>)/g)) {
        const hex = m[1].replace(/\s+/g, '');
        if (hex.length % hexChars !== 0) continue;
        let decoded = '';
        for (let i = 0; i < hex.length; i += hexChars) {
          decoded += cmap.get(parseInt(hex.slice(i, i + hexChars), 16)) ?? '';
        }
        if (decoded) chunks.push(decoded);
      }
    }
  }

  return chunks
    .join(' ')
    .replace(/\\([()\\])/g, '$1')
    // PDFs frequently split glyphs for kerning ("2 4 8-6 3 5"); collapsing
    // spaces between digits is what makes the phone patterns match.
    .replace(/\s+/g, ' ');
}

/**
 * Whether a PDF yielded enough real text to trust a clean scan.
 *
 * A guard that cannot read a file must fail, not pass: an unreadable PDF is
 * reported as a problem so it gets checked by hand rather than published on
 * the strength of an empty match.
 */
export function looksReadable(text) {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const words = (text.match(/\b[A-Za-z]{3,}\b/g) ?? []).length;
  return letters >= 200 && words >= 40;
}

/** Digits in a PDF are often kerned apart. Also test a de-spaced copy. */
function pdfVariants(text) {
  return [text, text.replace(/(?<=\d)\s+(?=\d)/g, ''), text.replace(/\s+/g, '')];
}

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile()) yield full;
  }
}

/**
 * The files that would actually be published: everything git tracks, plus
 * untracked files that are not ignored. A .gitignore'd file never reaches
 * GitHub, so scanning it only produces false alarms — but the moment someone
 * force-adds one it becomes tracked and shows up here.
 *
 * Falls back to walking the filesystem outside a git checkout.
 */
function publishableFiles() {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const files = out.split('\0').filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    /* not a git checkout, or git unavailable */
  }
  return [...walk(ROOT)].map((f) => relative(ROOT, f).split(sep).join('/'));
}

const problems = [];

function report(file, rule, sample) {
  problems.push({ file, rule, sample });
}

/** Trim a match so the output never reprints a full secret or phone number. */
function redact(match) {
  const s = String(match).trim();
  if (s.length <= 6) return s;
  return `${s.slice(0, 3)}…${s.slice(-2)} (${s.length} chars)`;
}

for (const rel of publishableFiles()) {
  const full = join(ROOT, rel);

  for (const rule of FORBIDDEN_PATHS) {
    if (rule.re.test(rel)) report(rel, rule.name, '(file must not be committed)');
  }

  const dot = rel.lastIndexOf('.');
  const ext = dot === -1 ? '' : rel.slice(dot).toLowerCase();

  if (ext === '.pdf') {
    if (rel !== ALLOWED_PDF) {
      report(rel, 'unapproved PDF', `only ${ALLOWED_PDF} may be committed`);
      continue;
    }
    let pdfBytes;
    try {
      pdfBytes = readFileSync(full);
    } catch {
      continue; // staged deletion
    }
    const text = extractPdfText(pdfBytes);

    // Fail closed: if we cannot read the PDF, we cannot clear it.
    if (!looksReadable(text)) {
      report(
        rel,
        'PDF text could not be extracted',
        'check this file by hand before publishing it'
      );
      continue;
    }

    for (const rule of PHONE_RULES) {
      for (const variant of pdfVariants(text)) {
        const m = variant.match(rule.re);
        if (m) {
          report(rel, `${rule.name} inside PDF`, redact(m[0]));
          break;
        }
      }
    }
    continue;
  }

  if (!TEXT_EXT.has(ext)) continue;

  let content;
  try {
    content = readFileSync(full, 'utf8');
  } catch {
    continue;
  }

  for (const rule of TEXT_RULES) {
    const m = content.match(rule.re);
    if (m) report(rel, rule.name, redact(m[0]));
  }

  if (!SECRET_SCAN_EXEMPT.has(rel)) {
    for (const rule of SECRET_RULES) {
      const m = content.match(rule.re);
      if (m) report(rel, rule.name, redact(m[0]));
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (problems.length === 0) {
    console.log('Privacy check passed: no personal data, credentials or private files found.');
    process.exit(0);
  }

  console.error(`\nPrivacy check FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) {
    console.error(`  ${p.file}`);
    console.error(`    ${p.rule}: ${p.sample}\n`);
  }
  console.error('Nothing is published until these are resolved. See AGENTS.md.\n');
  process.exit(1);
}
