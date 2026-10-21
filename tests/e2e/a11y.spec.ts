import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createPlan, startAsGuest } from './helpers';

async function audit(page: import('@playwright/test').Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${name}: ${v.id} ${v.help} → ${v.nodes.map((n) => n.target.join(' ') + ' ' + (n.failureSummary ?? '').replace(/\s+/g, ' ')).join(' | ')}`)).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test(`main screens have no serious accessibility violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/welcome');
    await audit(page, 'welcome');
    await startAsGuest(page);
    await audit(page, 'home');
    await createPlan(page);
    await audit(page, 'project');
    await page.getByRole('region', { name: 'Start here' }).getByRole('button', { name: 'Start now' }).click();
    await audit(page, 'focus');
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await audit(page, 'complete');
    for (const path of ['/projects', '/progress', '/settings', '/auth?mode=signup']) {
      await page.goto(path);
      await audit(page, path);
    }
  });
}

test('touch targets in the bottom navigation and task rows are at least 44px', async ({ page }) => {
  await startAsGuest(page);
  await createPlan(page);
  const boxes = await page.locator('nav[aria-label="Main"] a, [role="checkbox"], [aria-label^="Options for"]').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)),
  );
  expect(boxes.length).toBeGreaterThan(5);
  expect(Math.min(...boxes)).toBeGreaterThanOrEqual(44);
});

test('no horizontal scrolling on the main screens', async ({ page }) => {
  await startAsGuest(page);
  await createPlan(page);
  for (const path of ['/', '/projects', '/progress', '/settings']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
