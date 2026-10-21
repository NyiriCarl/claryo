import { expect, test } from '@playwright/test';
import { createPlan, serverProjects, signIn, startAsGuest } from './helpers';

const uniq = (info: { project: { name: string } }, who: string) => `${who}-${info.project.name}-${Date.now()}@example.com`;

test.describe('Flow A: first-time user creates a project', () => {
  test('welcome → goal → clarifying question → plan → start → complete → progress', async ({ page }) => {
    await page.goto('/');
    // New users land on the welcome screen.
    await expect(page.getByRole('heading', { name: 'Big goals. Clear first steps.' })).toBeVisible();
    await page.getByRole('button', { name: 'Get started' }).click();

    // Validation: empty goal.
    await page.getByRole('button', { name: 'Break it down' }).click();
    await expect(page.getByRole('alert')).toContainText('Add a little more detail');

    await page.getByRole('button', { name: 'Start a business' }).click();
    await page.getByRole('button', { name: 'Break it down' }).click();

    // Clarification only for vague goals.
    await expect(page.getByRole('heading', { name: 'What kind of business are you thinking about?' })).toBeVisible();
    await page.getByRole('button', { name: 'Clothing or fashion' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Plan with a Start Here card, phases, and an honest demo label.
    const card = page.getByRole('region', { name: 'Start here' });
    await expect(card).toBeVisible();
    await expect(page.getByText('Demo plan, not AI-generated')).toBeVisible();
    await expect(page.getByText('0 of 9 tasks done')).toBeVisible();
    const firstTask = (await card.getByRole('heading').textContent())!.trim();

    await card.getByRole('button', { name: 'Start now' }).click();
    await expect(page.getByRole('heading', { name: firstTask })).toBeVisible();
    await page.getByRole('button', { name: '5 min', exact: true }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByRole('timer')).toBeVisible();
    await page.getByRole('button', { name: 'Mark complete' }).click();

    await expect(page.getByRole('heading', { name: 'Nice work. One step forward.' })).toBeVisible();
    await expect(page.getByText('1 of 9 tasks done')).toBeVisible();

    await page.getByRole('button', { name: 'Return to project' }).click();
    await expect(page.getByText('1 of 9 tasks done')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next step' })).toBeVisible();

    await page.getByRole('link', { name: 'Progress' }).click();
    await expect(page.getByText('11%')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recently completed' })).toBeVisible();
    await expect(page.getByText(firstTask)).toBeVisible();
  });

  test('cancel during generation and retry after a failure', async ({ page }) => {
    await startAsGuest(page);
    await page.route('**/ai/plan', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ai_unavailable', message: 'down' } }) }));
    await page.getByRole('textbox', { name: 'Your goal' }).fill('Plan a church conference');
    await page.getByRole('button', { name: 'Break it down' }).click();
    await expect(page.getByRole('heading', { name: 'Planning is unavailable right now' })).toBeVisible();
    await page.unroute('**/ai/plan');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('region', { name: 'Start here' })).toBeVisible();
  });
});

test.describe('Flow B: returning user resumes work', () => {
  test('progress persists, focus session survives reload, ending a timer never completes the task', async ({ page }) => {
    await page.clock.install();
    await startAsGuest(page);
    await createPlan(page, 'Build a portfolio website');
    const card = page.getByRole('region', { name: 'Start here' });
    const firstTask = (await card.getByRole('heading').textContent())!.trim();

    // Leave and come back: Home shows the recommended action.
    await page.reload();
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Your next step' })).toBeVisible();
    await page.getByRole('button', { name: 'View task' }).click();
    await expect(page.getByRole('heading', { name: firstTask, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Start now' }).click();
    await page.getByRole('button', { name: '10 min' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();

    await page.clock.fastForward('02:00');
    await expect(page.getByRole('timer')).toHaveText('8:00');
    await page.getByRole('button', { name: 'Pause' }).click();

    // App restart: the paused session is still there with the same time left.
    await page.reload();
    await expect(page.getByRole('timer')).toHaveText('8:00');
    await expect(page.getByText('Paused')).toBeVisible();

    // Exit early, keep the session, resume from Home.
    await page.getByRole('button', { name: 'Exit focus mode' }).click();
    await page.getByRole('button', { name: 'Pause and resume later' }).click();
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByText('Focus session paused')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    // Wait for Focus Mode to render (the URL changes before the screen does),
    // so the click can't land on one of Home's Resume buttons.
    await expect(page.getByRole('timer')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();

    // Time runs out while "in the background": the task is NOT completed automatically.
    await page.clock.fastForward('09:00');
    await expect(page.getByText("Time's up. Finished, or want a few more minutes?")).toBeVisible();
    await page.getByRole('button', { name: 'Not done yet, save for later' }).click();
    await expect(page.getByRole('heading', { name: firstTask, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark complete' })).toBeVisible();

    await page.getByRole('button', { name: 'Mark complete' }).click();
    await expect(page.getByRole('heading', { name: 'Nice work. One step forward.' })).toBeVisible();
  });
});

test.describe('Flow C: user is overwhelmed', () => {
  test('break a task down, edit suggestions, accept, start one subtask', async ({ page }) => {
    await startAsGuest(page);
    await createPlan(page);
    await page.getByRole('region', { name: 'Start here' }).getByRole('button', { name: 'Break this down' }).click();

    await expect(page.getByText('Demo suggestion, not AI')).toBeVisible();
    const step1 = page.getByRole('textbox', { name: 'Step 1' });
    await step1.fill('Open the course page');
    await page.getByRole('button', { name: 'Remove step 3' }).click();
    await page.getByRole('button', { name: 'Add as steps of this task' }).click();

    await expect(page.getByRole('heading', { name: /Steps/ })).toBeVisible();
    await expect(page.getByText('(0/2 done)')).toBeVisible();
    await page.getByRole('link', { name: 'Open the course page' }).click();
    await page.getByRole('button', { name: 'Start now' }).click();
    await expect(page.getByRole('heading', { name: 'Open the course page' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await expect(page.getByRole('heading', { name: 'Nice work. One step forward.' })).toBeVisible();
  });

  test('cancel keeps the task unchanged; replace swaps it for the new steps', async ({ page }) => {
    await startAsGuest(page);
    await createPlan(page);
    const title = (await page.getByRole('region', { name: 'Start here' }).getByRole('heading').textContent())!.trim();
    await page.getByRole('region', { name: 'Start here' }).getByRole('button', { name: 'Break this down' }).click();
    await page.getByRole('button', { name: 'Cancel, keep the task as it is' }).click();
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Break this down' }).click();
    await page.getByRole('button', { name: 'Replace this task with these' }).click();
    await expect(page.getByText(/Replaced with 3 tasks/)).toBeVisible();
    await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0);
  });
});

test.describe('Flow D: simpler explanation', () => {
  test('explain simply, back to the task, start it', async ({ page }) => {
    await startAsGuest(page);
    await createPlan(page);
    const title = (await page.getByRole('region', { name: 'Start here' }).getByRole('heading').textContent())!.trim();
    await page.getByRole('button', { name: title }).first().click();
    await page.getByRole('button', { name: 'Explain simply' }).click();
    await expect(page.getByText(/In plain terms/)).toBeVisible();
    await page.getByRole('button', { name: 'Back to task' }).click();
    await page.getByRole('button', { name: 'Show an example' }).click();
    await expect(page.getByText(/Example:/)).toBeVisible();
    await page.getByRole('button', { name: 'Start the task' }).click();
    await expect(page.getByRole('main', { name: 'Focus mode' })).toBeVisible();
  });

  test('"I only have 10 minutes" gives one small action that can be started', async ({ page }) => {
    await startAsGuest(page);
    await createPlan(page);
    const title = (await page.getByRole('region', { name: 'Start here' }).getByRole('heading').textContent())!.trim();
    await page.getByRole('button', { name: title }).first().click();
    await page.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('button', { name: 'I only have 10 minutes' }).click();
    await expect(page.getByText('Try this')).toBeVisible();
    await page.getByRole('button', { name: 'Start this now' }).click();
    await expect(page.getByRole('main', { name: 'Focus mode' })).toBeVisible();
  });
});

test.describe('Flow E: offline', () => {
  test('guest offline: honest limitation, manual project saved locally', async ({ page, context }) => {
    await startAsGuest(page);
    await context.setOffline(true);
    await page.getByRole('textbox', { name: 'Your goal' }).fill('Paint the fence');
    await expect(page.getByText(/You're offline\. Making a plan needs a connection/)).toBeVisible();
    await page.getByRole('button', { name: 'Create project without AI' }).click();
    await expect(page.getByRole('heading', { name: 'No tasks yet' })).toBeVisible();
    await page.getByRole('button', { name: 'Add task' }).click();
    await page.getByRole('textbox', { name: 'Add task' }).fill('Buy paint');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('textbox', { name: 'Add task' }).fill('Sand the fence');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('0 of 2 tasks done')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Buy paint: not done' }).click();
    await expect(page.getByText('1 of 2 tasks done')).toBeVisible();
    await context.setOffline(false);
    await page.reload();
    await expect(page.getByText('1 of 2 tasks done')).toBeVisible();
  });

  test('signed in: offline edits sync when the connection returns', async ({ page, context }, info) => {
    const email = uniq(info, 'offline');
    await startAsGuest(page);
    await signIn(page, email);
    await context.setOffline(true);
    await page.getByRole('textbox', { name: 'Your goal' }).fill('Fix the bike');
    await page.getByRole('button', { name: 'Create project without AI' }).click();
    await expect(page.getByText(/You're offline\. Changes are saved on this device and will sync later/)).toBeVisible();
    expect(await serverProjects(email)).toHaveLength(0);
    await context.setOffline(false);
    await expect.poll(async () => (await serverProjects(email)).map((p) => p.data?.title), { timeout: 15_000 }).toContain('Fix the bike');
  });

  test('conflicting edits on two devices keep both versions', async ({ browser }, info) => {
    test.setTimeout(120_000);
    const email = uniq(info, 'conflict');
    const a = await browser.newPage();
    const b = await browser.newPage();
    for (const p of [a, b]) {
      await startAsGuest(p);
      await signIn(p, email);
    }
    await createPlan(a, 'Learn to cook jollof rice');
    await expect.poll(async () => (await serverProjects(email)).length, { timeout: 15_000 }).toBe(1);
    const id = (await serverProjects(email))[0].id;

    // Device B downloads it, opens it, then goes offline.
    await b.goto('/projects');
    await expect(b.getByText('Learn to cook jollof rice')).toBeVisible({ timeout: 15_000 });
    await b.getByText('Learn to cook jollof rice').click();
    await b.context().setOffline(true);

    // Device A renames and syncs first.
    await a.goto(`/projects/${id}`);
    await a.getByRole('button', { name: 'Rename project' }).click();
    await a.getByRole('textbox', { name: 'Project name' }).fill('Cooking (from A)');
    await a.keyboard.press('Enter');
    await expect.poll(async () => (await serverProjects(email))[0].data.title, { timeout: 15_000 }).toBe('Cooking (from A)');

    // Device B's offline rename conflicts when it reconnects.
    await b.getByRole('button', { name: 'Rename project' }).click();
    await b.getByRole('textbox', { name: 'Project name' }).fill('Cooking (from B)');
    await b.keyboard.press('Enter');
    await b.context().setOffline(false);
    await b.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(b.getByText(/was changed on another device\. We kept both versions/)).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await serverProjects(email)).map((p) => p.data?.title).sort(), { timeout: 15_000 }).toEqual([
      'Cooking (from A)',
      'Cooking (from B) (copy from this device)',
    ]);
  });
});

test.describe('Accounts, export and deletion', () => {
  test('guest projects move to the account on sign-in; export; delete account removes server data', async ({ page }, info) => {
    const email = uniq(info, 'account');
    await startAsGuest(page);
    await createPlan(page, 'Create a YouTube video');
    await signIn(page, email);
    await expect.poll(async () => (await serverProjects(email)).length, { timeout: 15_000 }).toBe(1);

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByText(email)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export my data' }).click();
    const file = await download;
    const json = JSON.parse(await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
    expect(json.device.projects).toHaveLength(1);
    expect(json.account.projects).toHaveLength(1);

    await page.getByRole('button', { name: 'Delete my account' }).click();
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('heading', { name: 'Big goals. Clear first steps.' })).toBeVisible();
    expect(await serverProjects(email)).toHaveLength(0);
  });

  test('sign-out removes account data from the device', async ({ page }, info) => {
    const email = uniq(info, 'signout');
    await startAsGuest(page);
    await signIn(page, email);
    await createPlan(page, 'Learn Python');
    await expect.poll(async () => (await serverProjects(email)).length, { timeout: 15_000 }).toBe(1);
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    // Signing back in brings them back from the account.
    await signIn(page, email);
    await page.getByRole('link', { name: 'Projects' }).click();
    // The project card's title; the same name can also appear as a subtitle elsewhere.
    await expect(page.locator('h3', { hasText: 'Learn Python' })).toBeVisible({ timeout: 15_000 });
  });
});
