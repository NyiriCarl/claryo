import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8799/make-server-b327929d';
export const devToken = (email: string) => 'dev.' + Buffer.from(email.toLowerCase()).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Fresh guest who has seen the welcome screen. */
export async function startAsGuest(page: Page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to get done?' })).toBeVisible();
}

/** Creates a plan from a specific goal (no clarification) and lands on the project. */
export async function createPlan(page: Page, goal = 'Learn UI/UX design') {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Your goal' }).fill(goal);
  await page.getByRole('button', { name: 'Break it down' }).click();
  await expect(page.getByText('Start here', { exact: true })).toBeVisible();
}

export async function signIn(page: Page, email: string) {
  await page.goto('/auth?mode=signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('anything-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to get done?' })).toBeVisible();
}

export async function serverProjects(email: string): Promise<any[]> {
  const res = await fetch(`${API}/me/projects`, { headers: { 'X-Session': devToken(email) } });
  return (await res.json()).projects;
}
