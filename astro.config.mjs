// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://rohundhar.github.io',
  output: 'static',

  integrations: [mdx(), sitemap()],

  // Fonts are downloaded, subset and self-hosted at build time, so the
  // deployed site makes no third-party font requests.
  fonts: [
    // Headings and body. One variable family covering 400-700.
    {
      provider: fontProviders.google(),
      name: 'Space Grotesk',
      cssVariable: '--font-sans',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      display: 'swap',
    },
    // 8-bit accent face. Short strings only: the hero name, section headings,
    // badges and the marquee. Never body copy.
    {
      provider: fontProviders.google(),
      name: 'Press Start 2P',
      cssVariable: '--font-pixel',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Courier New', 'monospace'],
      display: 'swap',
    },
    // Dates, stats and data chips.
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      display: 'swap',
    },
  ],
});
