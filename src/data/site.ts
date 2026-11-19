/**
 * Single source of truth for identity, contact and navigation.
 *
 * PRIVACY: email addresses are intentionally public (see AGENTS.md).
 * Never add a phone number, street address or any `tel:` link here.
 */

export const site = {
  name: 'Rohun Dhar',
  monogram: 'RD',

  /** Shown under the name in the hero. */
  titleLine: 'Full-stack applied AI engineer',

  /** Chosen Nov 2026 from the two drafts in docs/designdoc.md. */
  positioningLine:
    'Six years shipping mobile and growth products at Sonos and Sleep Reset. Now building applied AI, end to end.',

  openToLine:
    'Graduating Spring 2027 from Columbia (MBA + MS, AI/ML). Looking for forward-deployed and applied AI engineering roles in New York or remote.',

  /** Used for canonical URLs and JSON-LD. Must match `site` in astro.config.mjs. */
  url: 'https://rohundhar.github.io',

  description:
    'Rohun Dhar is a full-stack applied AI engineer. Six years shipping mobile and growth products at Sonos and Sleep Reset; now at Columbia for an MBA and MS in AI/ML.',

  email: 'rohundhar@gmail.com',
  emailSecondary: 'rohun.dhar@columbia.edu',

  linkedin: 'https://www.linkedin.com/in/rohun-dhar-83758b14a/',
  github: 'https://github.com/rohundhar',

  resume: '/resume.pdf',

  alumniOf: 'Columbia University',
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** External links open in a new tab and get a rel. */
  external?: boolean;
  /** Tagged for analytics once GoatCounter lands in Phase 4. */
  event?: string;
};

/** Order is fixed by docs/designdoc.md: Projects · About · Now · Resume · LinkedIn */
export const nav: readonly NavItem[] = [
  { label: 'Projects', href: '/projects/' },
  { label: 'About', href: '/about/' },
  { label: 'Now', href: '/now/' },
  { label: 'Resume', href: site.resume, external: true, event: 'resume-download' },
  { label: 'LinkedIn', href: site.linkedin, external: true, event: 'linkedin' },
];

/**
 * Three cards making the case for senior applied-AI and forward-deployed
 * engineering roles: production AI first, full-stack depth second, ownership
 * of ambiguous work third. Every claim is backed by the one-page resume.
 */
export const strengths = [
  {
    title: 'Production AI, not demos',
    body: 'At Sleep Reset I co-created a sleep-science agent that learned from published research and advised the way our coaches did. The coaching team relied on it as a trusted source, and it spoke with members directly when no coach was free.',
  },
  {
    title: 'Ships end to end',
    body: 'React Native apps on iOS and Android. Vue and PostgreSQL dashboards running in retail stores across three continents. OpenVPN infrastructure re-architected to provision 50% faster. Model, pipeline, API and interface \u2014 I build the whole path.',
  },
  {
    title: 'Owns the undefined part',
    body: "Led Sleep Reset's mobile team and ran its release cycle. Built the company's first growth funnel with no playbook to copy. Was Sonos's technical liaison for the Japanese market, working directly with partners. The problems I want are the ones that aren't specced yet.",
  },
] as const;

/**
 * Scrolling marquee descriptors. Every one is defensible: the roles and
 * degrees come from the resume, "Musician" and "Entrepreneur" from Rohun.
 */
export const descriptors = [
  'Engineer',
  'Entrepreneur',
  'Musician',
  'Founder',
  'Mobile Dev',
  'Growth Strategist',
  'Maker',
  'Columbia MBA \u00d7 MS',
] as const;

/**
 * Arcade score tiles. These stay at *overview* level — scope and span, not a
 * metric from one product. Specific outcomes belong in the strength cards and
 * the timeline, where they have context.
 *
 * Numbers come straight from the one-page resume — do not round, inflate or
 * invent new ones (see AGENTS.md).
 */
export const stats = [
  { value: '6', unit: 'yrs', label: 'Shipping production software', color: 'pink' },
  { value: '3', unit: 'platforms', label: 'iOS, Android and web', color: 'cyan' },
  { value: '3', unit: 'continents', label: 'Americas, Europe, APAC', color: 'gold' },
  { value: '2027', unit: 'grad', label: 'Columbia MBA \u00d7 MS, AI/ML', color: 'violet' },
] as const;


/**
 * Published projects. Each lives in its own public repo and publishes itself
 * to rohundhar.github.io/<repo>/ via GitHub Pages — this repo never copies
 * their source (see AGENTS.md).
 *
 * Set `liveUrl` to null if a project's Pages site is ever taken down; the card
 * then falls back to the repo link on its own.
 */
export const projects = [
  {
    title: 'Job Quest',
    pitch: 'A video-game job hunt driven by an LLM pipeline.',
    body: 'A weekly pipeline pulls roles from Greenhouse, Ashby and Lever boards, has Claude analyze and score each one, and ranks the best of them. Job Quest is the RPG-style tracker over the result. The public build runs on synthetic postings.',
    tags: ['LLM pipeline', 'Python', 'Claude', 'JavaScript'],
    /** Run mode, per docs/designdoc.md. Drives the card badge. */
    mode: 'demo',
    liveUrl: 'https://rohundhar.github.io/job-quest/',
    repoUrl: 'https://github.com/rohundhar/job-quest',
    color: 'violet',
  },
  {
    title: 'Ember & Rime',
    pitch: 'Five in a row on a board that never ends.',
    body: 'Two-player strategy on an endless board that widens as stones land near its edge, themed around fire and ice. The whole ruleset is customizable — board growth, win length and both elements.',
    tags: ['Game', 'HTML', 'CSS', 'JavaScript'],
    mode: 'embedded',
    liveUrl: 'https://rohundhar.github.io/ember-and-rime/',
    repoUrl: 'https://github.com/rohundhar/ember-and-rime',
    color: 'gold',
  },
] as const;

/** About-page skill groups. Source of truth is the one-page resume. */
export const skillGroups = [
  {
    label: 'AI & ML',
    items: ['PyTorch', 'Hugging Face', 'LangChain', 'Anthropic & OpenAI APIs', 'RAG', 'Embeddings & vector search'],
  },
  {
    label: 'Full stack',
    items: ['Python', 'TypeScript', 'JavaScript', 'React', 'React Native', 'Next.js', 'Node.js', 'FastAPI', 'Swift', 'C/C++', 'Bash', 'Git'],
  },
  {
    label: 'Data & cloud',
    items: ['PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'REST & GraphQL', 'AWS', 'GCP', 'Docker', 'GitHub Actions'],
  },
  {
    label: 'Hardware & prototyping',
    items: ['Circuit design', 'Soldering', 'Arduino & Raspberry Pi', 'IoT sensors', '3D printing', 'Laser cutting'],
  },
] as const;

export const languages = [
  { name: 'English', level: 'Native' },
  { name: 'Japanese', level: 'Proficient' },
  { name: 'Hindi', level: 'Proficient' },
] as const;
