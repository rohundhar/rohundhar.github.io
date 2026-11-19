import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
// `z` from 'astro:content' is the deprecated zod namespace in Astro 7.
import * as z from 'astro/zod';

/**
 * Experience timeline, rendered on /about/ and summarised on the home page.
 * A malformed or missing field fails the build rather than shipping a gap.
 */
const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    /** Display order, descending. Higher is more recent. */
    sort: z.number().int(),
    /** Human-readable range, e.g. "2018–2020" or "Current". */
    period: z.string().min(1),
    role: z.string().min(1),
    org: z.string().min(1),
    /**
     * City/metro only. Never a street address — see AGENTS.md.
     * Optional because ventures and remote roles may not have one.
     */
    location: z.string().min(1).optional(),
    kind: z.enum(['work', 'education', 'venture']),
    /** One scannable line for the home-page career track. */
    summary: z.string().min(1),
    /** Stack and skill chips shown on the career track. */
    tags: z.array(z.string().min(1)).default([]),
    highlights: z.array(z.string().min(1)).min(1),
  }),
});

/** Dated "what I'm doing now" entries. */
const now = defineCollection({
  loader: file('src/content/now.yaml'),
  schema: z.object({
    /** YYYY-MM. Kept as a string so display is timezone-free. */
    date: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'now.date must be YYYY-MM'),
    title: z.string().min(1),
    body: z.string().min(1),
    href: z.string().optional(),
    /**
     * Tie-breaker for entries sharing a month, ascending. Without it the
     * order of same-month entries is arbitrary, so which three reach the
     * home page could change between builds.
     */
    order: z.number().int().default(100),
  }),
});

export const collections = { experience, now };
