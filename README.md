# rohundhar.github.io

Personal site for Rohun Dhar — a static [Astro](https://astro.build) build deployed
to GitHub Pages at **https://rohundhar.github.io**.

The plan this implements is in [`docs/designdoc.md`](docs/designdoc.md).
**Read [`AGENTS.md`](AGENTS.md) before changing anything** — it carries the
privacy rules that govern this repo.

## Status

Phases 0 and 1 of the design doc are built: the shell, the design system and
the professional profile. The project portfolio is not built yet.

| Phase | Scope | State |
| --- | --- | --- |
| 0 — Foundation | Astro scaffold, deploy workflow, privacy check, Playwright | Done |
| 1 — Shell & profile | Layout, nav, footer, theme tokens, light/dark toggle, 404, hero, strengths, About, Now, resume link, SEO | Done |
| 1.5 — Home redesign | 16-bit arcade visual system, photo hero, scrolling marquee, stat tiles, high-level career track | Done |
| 2 — Portfolio system | `projects` collection, run panel, `/play/<slug>/` | Partial — cards and mode badges done; in-page run panel still to come |
| 3 — Projects | Ember & Rime, Job Quest | Live — both published and linked; write-ups still to come |
| 4 — Polish & launch | Thumbnails, GoatCounter analytics, Lighthouse, device checks | Not started |

Placeholders are marked `TODO(rohun)` in the source.

## Getting started

```sh
npm install
npm run dev          # http://localhost:4321
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Privacy check, then a production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Playwright smoke tests against the built site |
| `npm run privacy-check` | Scan the repo for personal data, credentials and private files |
| `npm run contrast-check` | Verify every colour token pair meets WCAG 2.2 AA |
| `npm run og` | Regenerate the Open Graph images and the touch icon (run `npm run build` first — it renders the cards in a browser using the built fonts) |
| `npm run check` | Astro/TypeScript diagnostics |

## Layout

```
.github/workflows/deploy.yml   Privacy check → contrast check → build → smoke test → deploy
public/
  resume.pdf                   PLACEHOLDER — see "Resume" below
  og/                          Open Graph images (committed, regenerate with `npm run og`)
  favicon.svg, robots.txt
scripts/
  privacy-check.mjs            Blocks personal data, secrets and private files
  contrast-check.mjs           WCAG 2.2 AA check on the colour tokens
  make-og.mjs                  Open Graph image generator (run locally, not in CI)
src/
  content.config.ts            zod schemas for the experience and now collections
  content/experience.yaml      Timeline — source of truth is the one-page resume
  content/now.yaml             "What I'm doing now", newest first
  data/site.ts                 Identity, contact, nav, strengths, skills, languages
  styles/global.css            Design tokens and base styles
  assets/profile.jpeg          Headshot, optimized by Astro at build time
  components/                  BaseHead, Nav, Footer, Hero, Marquee, Stats,
                               CareerTrack, Strengths, Projects, Timeline,
                               NowList, ThemeToggle, Monogram
  layouts/Base.astro
  pages/                       index, about, now, projects/index, 404
tests/smoke.spec.ts            Routes, hero above the fold, links, a11y, budget
```

## Editing content

Most changes do not need a code edit:

- **Who you are, contact links, hero copy, strengths, skills** — `src/data/site.ts`
- **Experience timeline** — `src/content/experience.yaml`
- **Now page** — `src/content/now.yaml` (`order` breaks ties within a month;
  the home page shows the first three)
- **Career track** — `summary` and `tags` in `src/content/experience.yaml` drive
  the home-page view; `highlights` drives the full timeline on `/about/`
- **Marquee words and stat tiles** — `descriptors` and `stats` in `src/data/site.ts`.
  Stat tiles stay at **overview** level (span and scope); a metric from one
  product belongs in a strength card or the timeline, where it has context
- **Projects** — `projects` in `src/data/site.ts`
- **Colours, type, spacing** — the tokens at the top of `src/styles/global.css`

Both YAML files are validated by zod schemas at build time, so a missing or
malformed field fails the build instead of shipping a gap.

## Resume

`public/resume.pdf` is the real, published resume (Nov 2026). It carries no
phone number and no address — verified by `npm run privacy-check`, which
decompresses every PDF git would publish and fails if it finds one.

Two things to know before replacing it:

- The **older** `ResumeOnePager.pdf` still carries a phone number. It lives in
  `docs/`, which is gitignored, and must never be copied into `public/`.
- The privacy check now **fails closed**: if it cannot extract text from a PDF
  it reports a problem rather than passing it. Some producers (LibreOffice
  among them) write text as hex glyph codes against a subset font, which an
  earlier version of the check read as nothing at all and cleared by mistake.

`docs/` holds local reference material only — the design doc and the old
resume. Both are gitignored: the repo has to be public for GitHub Pages, so
anything committed there is world-readable.

## Projects

Each project lives in its own public repo and publishes itself via GitHub Pages:

| Project | Repo | Live |
| --- | --- | --- |
| Job Quest | `rohundhar/job-quest` | https://rohundhar.github.io/job-quest/ |
| Ember & Rime | `rohundhar/ember-and-rime` | https://rohundhar.github.io/ember-and-rime/ |

`job-quest` deploys through its own `pages.yml` workflow (Pages source:
GitHub Actions) and the published build runs on synthetic postings — no real
job data is ever deployed. `ember-and-rime` is served straight from `main` at
the repo root.

This repo never copies their source. Card content lives in `projects` in
`src/data/site.ts`; set a project's `liveUrl` to `null` if its Pages site goes
away and the card falls back to the repo link on its own.

## Design system

A 16-bit arcade look: saturated colour, square corners, hard blur-free shadows
and pixel type — kept legible, because recruiters read this on a phone.

- **Type** — Space Grotesk for headings and body, **Press Start 2P** for pixel
  accents (the hero name, section headings, buttons, badges, the marquee), and
  JetBrains Mono for dates and data chips. Press Start 2P is for short strings
  only; it is unreadable in paragraphs. All three are downloaded, subset and
  self-hosted at build time by Astro's font pipeline, so the deployed site
  makes no third-party font requests.
- **Colour** — a five-colour arcade palette (`--c-pink`, `--c-cyan`,
  `--c-gold`, `--c-lime`, `--c-violet`), each with a matching `-wash`, over
  cream paper in the light theme and deep indigo in the dark one. Sections and
  cards are colour-coded so the page reads as a set of machines.
  **Every saturated token has a dark light-theme value and a bright dark-theme
  value — use the `-wash` variant as a background and the base as text, never
  the reverse.** `npm run contrast-check` verifies all 96 pairs against
  WCAG 2.2 AA and fails the build if one slips.
- **Surfaces** — `--drop`, `--drop-sm` and `--drop-lg` are the hard offset
  shadows the whole look depends on. Keep them blur-free. `.scanlines` adds a
  faint CRT overlay.
- **Layout** — 8px spacing grid, ~680px reading measure, ~1150px grid.
- **Motion** — a constant-speed descriptor marquee, a bobbing hero card,
  drifting background pixels and blinking cursors. All of it stops under
  `prefers-reduced-motion`, and the marquee becomes swipeable so no word
  is unreachable.

### Home-page components

| Component | What it is |
| --- | --- |
| `Hero.astro` | Character card (profile photo) plus the pitch and three CTAs |
| `Marquee.astro` | Descriptor banner scrolling at constant speed |
| `Stats.astro` | Four arcade score tiles — numbers come from the resume |
| `CareerTrack.astro` | High-level CV: one scannable row per role |
| `Strengths.astro` | Three ability panels |
| `Projects.astro` | Project cards with run-mode badge, live link and repo link |

The full bullet-by-bullet timeline stays on `/about/` (`Timeline.astro`); the
career track is the summary view.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which refuses to deploy
if the privacy check, contrast check, build or smoke tests fail.

One-time repo setup (not yet done — see the handoff notes):

1. Rename the existing `master` branch to `archive-2019-vue`.
2. Push this branch as `main` and make it the default.
3. Settings → Pages → Source: **GitHub Actions**.
