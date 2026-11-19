import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke tests for the site shell. These assert the acceptance criteria in
 * docs/designdoc.md that can be checked automatically; Lighthouse and
 * real-device checks are separate.
 */

const ROUTES = ['/', '/projects/', '/about/', '/now/'];

/** Collect console errors and failed requests for a page. */
function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? 'unknown';
    // Browsers abort speculative requests routinely; ignore those.
    if (failure.includes('ERR_ABORTED')) return;
    errors.push(`requestfailed: ${req.url()} (${failure})`);
  });
  return errors;
}

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route} returns 200 with no console errors`, async ({ page }) => {
      const errors = watchForErrors(page);
      const response = await page.goto(route);
      expect(response?.status(), `${route} should return 200`).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      expect(errors, `${route} logged errors`).toEqual([]);
    });
  }

  test('an unknown URL serves the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText("isn't here");
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Projects', exact: true }).first()).toBeVisible();
  });

  test('the resume PDF is reachable', async ({ request }) => {
    const response = await request.get('/resume.pdf');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('pdf');
  });

  test('robots.txt and the sitemap are published', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200);
    expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  });
});

test.describe('hero is visible without scrolling', () => {
  // The acceptance criterion in docs/designdoc.md, at both named viewports.
  const VIEWPORTS = [
    { name: 'desktop 1280x800', width: 1280, height: 800 },
    { name: 'phone 390x844', width: 390, height: 844 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`name, positioning line and buttons fit above the fold at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      // Scoped to the hero: the footer repeats these labels, and matching
      // page-wide silently tests the wrong element.
      const hero = page.locator('[data-hero]');

      const mustBeAboveFold = [
        hero.getByRole('heading', { level: 1 }),
        hero.getByText('Full-stack applied AI engineer'),
        hero.getByText('Six years shipping mobile and growth products'),
        hero.getByRole('link', { name: 'LinkedIn' }),
        hero.getByRole('link', { name: 'Resume' }),
        hero.getByRole('link', { name: 'Email' }),
      ];

      for (const locator of mustBeAboveFold) {
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box, 'element should have a box').not.toBeNull();
        expect(
          box!.y + box!.height,
          `"${(await locator.textContent())?.trim()}" must end above ${viewport.height}px`
        ).toBeLessThanOrEqual(viewport.height);
      }

      // Nothing may overflow horizontally at phone width.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    });
  }
});

test.describe('navigation and links', () => {
  test('every internal link resolves', async ({ page, request }) => {
    const seen = new Set<string>();

    for (const route of [...ROUTES, '/this-page-does-not-exist/']) {
      await page.goto(route);
      const hrefs = await page.locator('a[href]').evaluateAll((links) =>
        links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '')
      );
      for (const href of hrefs) {
        if (!href.startsWith('/') || href.startsWith('//')) continue;
        seen.add(href.split('#')[0]);
      }
    }

    expect(seen.size, 'should have found internal links to check').toBeGreaterThan(4);

    for (const href of seen) {
      const response = await request.get(href);
      expect(response.status(), `${href} should resolve`).toBeLessThan(400);
    }
  });

  test('the current page is marked in the nav', async ({ page }) => {
    await page.goto('/about/');
    const current = page.locator('nav[aria-label="Main"] a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/About/);
  });

  test('LinkedIn and Resume are reachable from every page', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const nav = page.locator('nav[aria-label="Main"]');
      await expect(nav.getByRole('link', { name: /LinkedIn/ })).toBeVisible();
      await expect(nav.getByRole('link', { name: /Resume/ })).toBeVisible();
    }
  });
});

test.describe('home page', () => {
  test('the profile photo renders with a descriptive alt text', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('[data-hero] img');
    await expect(photo).toBeVisible();

    const alt = await photo.getAttribute('alt');
    expect(alt, 'alt must describe the photo, not be empty or a filename').toBeTruthy();
    expect(alt!.toLowerCase()).not.toMatch(/\.(jpe?g|png|webp|avif)/);
    expect(alt!.length).toBeGreaterThan(10);

    // Explicit dimensions, so the hero does not shift as the image loads.
    expect(await photo.getAttribute('width')).toBeTruthy();
    expect(await photo.getAttribute('height')).toBeTruthy();

    const loaded = await photo.evaluate((img: HTMLImageElement) => img.naturalWidth > 0);
    expect(loaded, 'photo should actually load').toBe(true);
  });

  test('the marquee exposes each descriptor exactly once to assistive tech', async ({ page }) => {
    await page.goto('/');
    const marquee = page.locator('.marquee');
    await expect(marquee).toBeVisible();

    // The duplicate groups that make the loop seamless are aria-hidden, so a
    // screen reader should hear the list once, not three times.
    const spoken = await marquee.locator('ul:not([aria-hidden="true"]) li').allInnerTexts();
    expect(spoken.length).toBeGreaterThanOrEqual(3);

    const words = spoken.map((w) => w.trim().toLowerCase());
    for (const required of ['entrepreneur', 'musician', 'engineer']) {
      expect(words.filter((w) => w === required), `"${required}" should be announced once`).toHaveLength(1);
    }

    expect(await marquee.locator('ul[aria-hidden="true"]').count()).toBeGreaterThan(0);
  });

  test('the marquee stops when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const animation = await page
      .locator('.marquee__inner')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation, 'marquee must not scroll under prefers-reduced-motion').toBe('none');
  });

  test('the career track lists every role from the content file', async ({ page }) => {
    await page.goto('/');
    const roles = page.locator('.track__item');
    await expect(roles).toHaveCount(5);

    const text = (await page.locator('.track').innerText()).replace(/\s+/g, ' ');
    for (const org of ['Columbia', 'Sleep Reset', 'Sonos', 'South End Technology Center']) {
      expect(text, `career track should mention ${org}`).toContain(org);
    }
  });

  test('project cards link to the live site and the repo', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.project');
    await expect(cards).toHaveCount(2);

    for (const card of await cards.all()) {
      const title = (await card.locator('.project__title').innerText()).trim();

      const code = card.getByRole('link', { name: /Code/ });
      await expect(code, `${title} should link to its repo`).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/rohundhar\//
      );

      const play = card.getByRole('link', { name: /Play now/ });
      await expect(play, `${title} should link to its live build`).toHaveAttribute(
        'href',
        /^https:\/\/rohundhar\.github\.io\/[a-z-]+\/$/
      );

      // Outbound links must not hand the opener over to the new tab.
      for (const link of [code, play]) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
      }
    }
  });

  test('the stat tiles render with values and labels', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('.stat');
    await expect(tiles).toHaveCount(4);
    for (const tile of await tiles.all()) {
      expect((await tile.innerText()).trim().length).toBeGreaterThan(3);
    }
  });
});

test.describe('copy', () => {
  /**
   * Astro collapses the whitespace between prose and an inline <a> on the next
   * line, which silently produces "here,let me know". Guard the known spots.
   */
  test('inline links keep their surrounding spaces', async ({ page }) => {
    const cases = [
      { route: '/nope/', text: 'should be here, let me know' },
      { route: '/now/', text: "what you're building, send me a note" },
      { route: '/projects/', text: 'its own public repo on GitHub' },
    ];

    for (const { route, text } of cases) {
      await page.goto(route);
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(body, `${route} should read naturally`).toContain(text);
    }
  });
});

test.describe('accessibility basics', () => {
  test('the skip link focuses the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('every page has one h1 and a unique title', async ({ page }) => {
    const titles = new Set<string>();
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const title = await page.title();
      expect(title).toMatch(/^Rohun Dhar — /);
      expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
      titles.add(title);
    }
  });

  test('the layout holds at 200% zoom', async ({ page }) => {
    // 200% zoom at 1280px wide behaves like a 640px viewport.
    await page.setViewportSize({ width: 640, height: 512 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(640);
  });
});

test.describe('theme toggle', () => {
  test('toggles the theme and remembers the choice', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toBeVisible();

    await toggle.click();
    const afterClick = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(['light', 'dark']).toContain(afterClick);

    const stored = await page.evaluate(() => localStorage.getItem('rd-theme'));
    expect(stored).toBe(afterClick);

    await page.reload();
    const afterReload = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(afterReload, 'theme should survive a reload').toBe(afterClick);
  });
});

test.describe('performance budget', () => {
  test('the home page first load stays under 300 KB', async ({ page }) => {
    let bytes = 0;
    page.on('response', async (response) => {
      const sizes = await response.request().sizes().catch(() => null);
      if (sizes) bytes += sizes.responseBodySize + sizes.responseHeadersSize;
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const kb = bytes / 1024;
    console.log(`  home page first load: ${kb.toFixed(1)} KB (uncompressed; budget 300 KB)`);
    expect(kb).toBeLessThan(300);
  });

  test('no third-party requests are made', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') external.push(request.url());
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(external, 'fonts must be self-hosted; only analytics may be third-party').toEqual([]);
  });
});
