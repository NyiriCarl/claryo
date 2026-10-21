import { expect, test, type Page } from '@playwright/test';
import { createPlan, startAsGuest } from './helpers';

// Layout checks on the smallest common phone width (320px, e.g. iPhone SE 1st gen
// and small Android phones), with a long project title to stress wrapping.
test.use({ viewport: { width: 320, height: 640 } });

const LONG = 'Organise a three-day international photography and storytelling workshop for teenagers in Lagos';

/** Returns layout problems on the current screen: sideways scroll, button text that
 *  doesn't fit its button, and controls smaller than a 44px touch target. */
async function layoutProblems(page: Page) {
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
    const controls = [...document.querySelectorAll<HTMLElement>('button, [role=button], [role=radio], [role=switch], [role=tab], select')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && !el.closest('.sr-only');
    });
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.innerText || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) out.push(`text doesn't fit: "${name}"`);
      if (Math.min(r.width, r.height) < 44) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: "${name}"`);
    }
    return out;
  });
}

test('screens fit a 320px phone: no sideways scroll, button text fits, 44px targets', async ({ page }) => {
  await startAsGuest(page);
  await createPlan(page, LONG);
  const projectPath = new URL(page.url()).pathname;
  expect(await layoutProblems(page), 'project').toEqual([]);

  await page.getByRole('button', { name: 'Start now' }).click();
  await page.waitForURL(/\/focus\//);
  const [, , pid, tid] = new URL(page.url()).pathname.split('/');
  expect(await layoutProblems(page), 'focus').toEqual([]);

  await createPlan(page, 'Learn UI/UX design'); // a second project shows the sort control
  for (const path of ['/', '/projects', '/progress', '/settings', projectPath, `/projects/${pid}/tasks/${tid}`, `/projects/${pid}/tasks/${tid}/done`]) {
    await page.goto(path);
    expect(await layoutProblems(page), path).toEqual([]);
  }
});
