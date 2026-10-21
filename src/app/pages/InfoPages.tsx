import type { ReactNode } from 'react';
import { Screen, TopBar } from '../components/Layout';
import { Notice } from '../components/ui';
import { brand } from '../../brand.config';

function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen>
      <TopBar back="/settings" title={title} />
      <main tabIndex={-1} className="flex flex-col gap-4 px-5 pb-10 t-body text-ink-2 outline-none [&_h2]:mt-2 [&_h2]:t-section [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </main>
    </Screen>
  );
}

// Describes what the app actually does today. Keep in sync with the code.
export function PrivacyPage() {
  return (
    <InfoPage title="Privacy notice">
      <Notice tone="warn">Draft for the testing phase. It describes how this version handles data and will be reviewed before public launch.</Notice>
      <h2>What we store</h2>
      <ul>
        <li>Your projects, tasks and progress. As a guest, these stay in your browser on this device only.</li>
        <li>If you create an account: your email address, your projects and tasks, your display name and app preferences, stored on our servers so you can use them on other devices.</li>
        <li>Basic records of AI requests (type of request, time, whether it worked). We don't keep the text of your goals in these records.</li>
        <li>Daily usage counts used to apply fair-use limits. For guests these are linked to a scrambled (hashed) version of the network address, not to your identity.</li>
        <li>Feedback you choose to send.</li>
      </ul>
      <h2>AI processing</h2>
      <p>
        When the AI service is connected, the text of your goal, your answers to clarifying questions and the task you ask for help with are sent to our AI provider (Anthropic) to generate plans and suggestions. In demo mode nothing is sent to an AI provider.
      </p>
      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell your data or show ads.</li>
        <li>We don't use analytics or tracking cookies in this version.</li>
        <li>Focus-session history stays on your device.</li>
      </ul>
      <h2>Your controls</h2>
      <ul>
        <li>Export: Settings › Export my data downloads everything as a file.</li>
        <li>Delete: Settings › Delete my account removes your account and its data from our servers and this device. Guests can delete everything on the device.</li>
        <li>Signing out removes your account's projects from this device.</li>
      </ul>
      <h2>Security</h2>
      <p>Data travels over encrypted connections (HTTPS). Each account can only read and change its own records. Passwords are handled by our sign-in provider and are never stored by the app itself.</p>
    </InfoPage>
  );
}

export function TermsPage() {
  return (
    <InfoPage title="Terms of use">
      <Notice tone="warn">The terms of use haven't been written yet. They must be completed before public launch.</Notice>
      <p>
        While {brand.name} is being tested: plans and suggestions are general guidance, not professional advice, and may contain mistakes. Time estimates are rough guesses. You decide what to do and when a task is done.
      </p>
    </InfoPage>
  );
}

export function HelpPage() {
  const faq: [string, string][] = [
    ['How do I start?', 'On Home, describe what you want to get done in your own words and tap "Break it down". You get a short plan with a "Start here" card. Tap "Start now" to begin.'],
    ['What if a task feels too big?', 'Open the task and tap "Break this down", or "More options" for "I\'m stuck" or "I only have 10 minutes". You review suggestions before anything changes.'],
    ['Does the timer mark tasks done?', 'No. When time is up you choose: mark it complete, add 5 minutes, or save it for later.'],
    ['Do I need an account?', 'No. Without an account your projects are saved on this device. Create an account to keep them safe and use them on other devices.'],
    ['Can I use it offline?', 'Yes, for projects you already have: open, edit, tick off tasks and use the focus timer. Making a new plan needs a connection, but you can create a project and add tasks yourself. If you are signed in, changes sync when you reconnect.'],
    ['What is demo mode?', 'When the AI service isn\'t connected, plans come from built-in templates. They are clearly marked "Demo".'],
    ['How is progress calculated?', 'Completed tasks divided by the total number of tasks in the project. Steps inside a task don\'t count separately.'],
  ];
  return (
    <InfoPage title="Help">
      {faq.map(([q, a]) => (
        <section key={q}>
          <h2 className="!t-body font-semibold !text-ink">{q}</h2>
          <p className="mt-1">{a}</p>
        </section>
      ))}
    </InfoPage>
  );
}
