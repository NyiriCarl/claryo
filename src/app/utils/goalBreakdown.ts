import type { Goal, ExecutionStep, MiniStep, GoalAction } from '../store/useGoalStore';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeAction(text: string, duration: string, justStartText: string): GoalAction {
  return { id: uid(), text, duration, justStartText, completed: false };
}

function makeMini(text: string): MiniStep {
  return { id: uid(), text, completed: false };
}

function makeExec(text: string): ExecutionStep {
  return { id: uid(), text, completed: false };
}

type Template = {
  category: string;
  rewrittenTitle: (input: string) => string;
  startNow: GoalAction;
  nextStep: GoalAction;
  miniBreakdown: MiniStep[];
  executionSteps: ExecutionStep[];
};

function buildTemplates(): Template[] {
  return [
    {
      category: 'business',
      rewrittenTitle: () => 'Launch your first product',
      startNow: makeAction(
        'Open Notes. Write your business idea in 1 sentence.',
        '2 mins',
        'Just open Notes app. Nothing else.'
      ),
      nextStep: makeAction(
        'Post one photo to Instagram with "Coming soon 👀"',
        '5 mins',
        'Just open Instagram.',
        ),
      miniBreakdown: [
        makeMini('Find 3 people who have the same problem'),
        makeMini('Name your business'),
        makeMini('Post your first offer'),
      ],
      executionSteps: [
        makeExec('Open Notes app'),
        makeExec('Type your business name idea'),
        makeExec('Write one sentence: what does it sell?'),
        makeExec('Send that sentence to one person now'),
        makeExec('Done. You officially started. 🔥'),
      ],
    },
    {
      category: 'learn',
      rewrittenTitle: () => 'Write your first line of code',
      startNow: makeAction(
        'Open YouTube. Search "Python for beginners".',
        '2 mins',
        'Just open YouTube.'
      ),
      nextStep: makeAction(
        'Watch 10 minutes of the first video',
        '10 mins',
        'Press play. Just one video.'
      ),
      miniBreakdown: [
        makeMini('Watch one tutorial today'),
        makeMini('Type "Hello World" in a code editor'),
        makeMini('Build one tiny project'),
      ],
      executionSteps: [
        makeExec('Open YouTube on your phone'),
        makeExec('Search: Python for beginners 2024'),
        makeExec('Click the first result'),
        makeExec('Press play'),
        makeExec('Watch for 10 minutes without pausing'),
      ],
    },
    {
      category: 'fitness',
      rewrittenTitle: () => 'Start moving today',
      startNow: makeAction(
        'Do 10 push-ups right now. Drop and do it.',
        '2 mins',
        'Just get on the floor.'
      ),
      nextStep: makeAction(
        'Drink a glass of water and put on gym clothes',
        '3 mins',
        'Just drink water right now.'
      ),
      miniBreakdown: [
        makeMini('Complete one workout today'),
        makeMini('Plan meals for tomorrow'),
        makeMini('Sleep before midnight'),
      ],
      executionSteps: [
        makeExec('Stand up from where you are'),
        makeExec('Drop to the floor'),
        makeExec('Do 10 push-ups (or as many as you can)'),
        makeExec('Stand back up'),
        makeExec('Done. That\'s your workout started. 🔥'),
      ],
    },
    {
      category: 'creative',
      rewrittenTitle: () => 'Make your first creative piece',
      startNow: makeAction(
        'Open a blank page and write or sketch anything. No edits.',
        '3 mins',
        'Just open a blank page.'
      ),
      nextStep: makeAction(
        'Take a photo or screenshot — share it with one person',
        '2 mins',
        'Just take one photo.'
      ),
      miniBreakdown: [
        makeMini('Finish one rough draft or sketch'),
        makeMini('Share it with one person for feedback'),
        makeMini('Post it publicly'),
      ],
      executionSteps: [
        makeExec('Open Notes, Canva, or paper'),
        makeExec('Set a 5-minute timer'),
        makeExec('Create anything — don\'t edit yet'),
        makeExec('When timer ends: stop'),
        makeExec('Send it to one friend. Done. 🎨'),
      ],
    },
    {
      category: 'general',
      rewrittenTitle: (input: string) => input.length > 40 ? input.slice(0, 40) + '…' : input,
      startNow: makeAction(
        'Open Notes. Write your goal and today\'s date.',
        '2 mins',
        'Just open Notes app.'
      ),
      nextStep: makeAction(
        'Tell one person your goal out loud — right now',
        '2 mins',
        'Just text one person: "I\'m starting [goal]".'
      ),
      miniBreakdown: [
        makeMini('Take the smallest possible first action'),
        makeMini('Do it again tomorrow'),
        makeMini('Build a 3-day streak'),
      ],
      executionSteps: [
        makeExec('Open Notes on your phone'),
        makeExec('Write your goal at the top'),
        makeExec('Write today\'s date next to it'),
        makeExec('Write ONE thing you can do in the next 5 minutes'),
        makeExec('Do that one thing now. Go. 🚀'),
      ],
    },
  ];
}

function detectCategory(goal: string): string {
  const lower = goal.toLowerCase();
  if (/business|startup|brand|product|sell|entrepreneur|company|app|saas|ecommerce|store|shop|freelance|income|money/.test(lower)) return 'business';
  if (/learn|code|python|javascript|programming|skill|study|course|language|math|design|ux|ui|dev|software|web/.test(lower)) return 'learn';
  if (/fitness|workout|gym|weight|muscle|run|exercise|health|diet|lose|gain|sport|push|squat/.test(lower)) return 'fitness';
  if (/art|draw|music|write|creative|paint|blog|youtube|content|photo|film|podcast|novel|song|beat/.test(lower)) return 'creative';
  return 'general';
}

export function generateGoalBreakdown(goalInput: string): Goal {
  const category = detectCategory(goalInput);
  const templates = buildTemplates();
  const template = templates.find(t => t.category === category) || templates[templates.length - 1];

  return {
    id: uid(),
    originalInput: goalInput,
    rewrittenTitle: template.rewrittenTitle(goalInput),
    startNow: { ...template.startNow, id: uid() },
    nextStep: { ...template.nextStep, id: uid() },
    miniBreakdown: template.miniBreakdown.map(ms => ({ ...ms, id: uid() })),
    executionSteps: template.executionSteps.map(es => ({ ...es, id: uid() })),
    currentExecutionStep: 0,
    executionCompleted: false,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    category,
    isStarted: false,
    stepsCompleted: 0,
  };
}
