# AGENTS.md

Instructions for any coding agent or human working in this repository.

This repo builds **https://rohundhar.github.io**, a public website. Everything
committed here is world-readable and crawlable the moment it deploys. Treat the
whole repo as published, not as a workspace.

---

## 1. Never publish personal contact or location data

This is the hard rule of this repo. It overrides convenience, "it was already in
the source file", and "the user asked me to just copy it in".

**Do not reproduce real personal data anywhere in this repo — including in
documentation, comments, denylists, test fixtures or commit messages.** Writing a
real phone number into a file that exists to ban phone numbers still publishes
it. Describe the pattern, or use an obviously fake placeholder such as
`+1 555-0100`.

### Never commit, embed, or publish

- **Phone numbers**, in any format — international (`+1`) prefixed,
  parenthesised area code, dot- or dash-separated, bare 10-digit runs, or the
  same digits split across elements to dodge a scanner. This includes numbers
  inside PDFs, images, Open Graph images, `vcf`/vCard files, JSON-LD, and
  `tel:` links.
- **Street or mailing addresses.** House or apartment number plus street name,
  ZIP/postal codes tied to a residence, campus mailbox or dorm addresses.
- **Date of birth, government IDs**, driver's license, passport, SSN or any
  fragment of one.
- **Exact personal geolocation**: home coordinates, a map pin on a residence,
  EXIF GPS left in an uploaded photo.
- **Anyone else's** personal data — family, classmates, coworkers, recruiters —
  including names paired with contact details.

### Explicitly allowed

- **Email addresses.** `rohundhar@gmail.com` (primary) and
  `rohun.dhar@columbia.edu` (secondary) may appear in plain text, in `mailto:`
  links, in JSON-LD and in the footer. Rohun has accepted that these are
  scrapeable. Do not obfuscate them.
- **City- and metro-level locations for employers and schools** — "Boston, MA",
  "San Francisco, CA", "New York, NY". These describe organizations, not a
  residence. An employer's public office city is fine; Rohun's home address is
  not.
- **Public professional profiles**: LinkedIn and GitHub URLs.

### The resume is the main trap

`public/resume.pdf` is the approved public copy (Nov 2026): no phone number, no
address. It is safe to publish and is the file the site links to.

The **older** `ResumeOnePager.pdf` still carries a phone number. It lives in
`docs/` (gitignored) for reference only and must never be copied into `public/`.

- Any replacement for `public/resume.pdf` must be scrubbed the same way.
- `scripts/privacy-check.mjs` decompresses every PDF git would publish, decodes
  both literal and hex-encoded text, and fails the build on a phone-number
  pattern. **It also fails closed**: a PDF whose text cannot be extracted is
  reported rather than cleared, because a guard that cannot read a file cannot
  approve it.
- Do not weaken, skip or special-case that check to get a build green. Fix the
  PDF instead.

### If you are unsure

Ask Rohun. Do not infer consent from a file being present on his machine, from
the data appearing in a private document, or from an earlier task where he
shared it with you directly. Sharing something with an agent is not publishing it.

---

## 2. Other things that must never be committed

Carried over from `docs/designdoc.md`:

- `.env` files or anything matching `.env.*` (except `.env.example`).
- API keys and tokens. The privacy check greps for `sk-`, `AIza`,
  `service_role` and similar prefixes.
- Job-search private data: `postings*.csv`, `postings_overflow.csv`,
  `job_tracker_state*.json`, `analyses.jsonl`, `job_pipeline/data/`, the real
  `candidate_profile.md` and `config.json`.
- Any resume other than the approved, scrubbed public PDF.

Run `npm run privacy-check` before any commit. CI runs it before every build and
the deploy fails if it trips.

The check scans **what git would publish** — everything tracked, plus untracked
files that are not ignored. Gitignored files are skipped, because they never
reach GitHub. Force-adding one (`git add -f`) makes it tracked, and the check
catches it again. `docs/` is gitignored for exactly this reason: it holds the
design doc and the working resume, and this repo must be public.

---

## 3. Content and copy rules

- **Do not invent facts, numbers, dates, employers or outcomes.** Every claim on
  this site has to be defensible in an interview. Source of truth for the
  timeline is the one-page resume; source of truth for structure is
  `docs/designdoc.md`.
- Where copy is genuinely missing, write `TODO(rohun): …` rather than filling
  the gap with something plausible.
- Metrics come from the resume. Don't round, inflate, or restate them as
  different metrics.

---

## 4. Project code stays in project repos

The website repo never copies a project's source. Each portfolio project lives
in its own public repo and publishes itself to
`https://rohundhar.github.io/<repo-name>/` via GitHub Pages. This repo holds
only write-ups that embed those URLs.

Because every project shares the `rohundhar.github.io` origin, project repos
must prefix all `localStorage` keys with the project name and use relative asset
paths.

Never name a project repo `about`, `projects`, `play`, `now`, `og` or `assets` —
those collide with this site's routes.

---

## 5. Working in this repo

```sh
npm install
npm run dev            # local dev server
npm run privacy-check  # run this before committing
npm run build          # privacy check, then astro build
npm run check          # astro type/diagnostics check
npm test               # Playwright smoke tests
```

- **Framework:** Astro 7, static output, TypeScript strict.
- **Styling:** plain CSS with custom properties in `src/styles/global.css`. No
  CSS framework. All color goes through tokens so the light/dark themes stay in
  sync — never hardcode a hex value in a component.
- **Fonts:** configured in `astro.config.mjs` via Astro's built-in font API,
  which self-hosts and subsets them at build time. Do not add a webfont `<link>`
  to a third-party CDN; analytics is the only permitted third-party request.
- **Accessibility is a shipping requirement**, not polish: WCAG 2.2 AA contrast,
  visible focus rings, a working skip link, and a layout that holds at 200% zoom.
  `npm run contrast-check` verifies the token pairs.
- **Deploy:** push to `main`. `.github/workflows/deploy.yml` runs the privacy
  check, builds, and deploys to GitHub Pages. Pages source is set to
  GitHub Actions, not a branch.
