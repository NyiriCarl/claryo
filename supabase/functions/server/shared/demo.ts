// Demo planner: deterministic, template-based output used when no AI provider
// is configured. Every response produced here is labelled "demo" by the caller
// and must never be presented as AI-generated.

import type {
  Clarification,
  Plan,
  PlanResult,
  PlanTask,
  SimplifyAction,
  SimplifyResult,
  TaskContext,
} from "./plan.ts";

type T = [title: string, description: string, minutes: number | null, steps?: string[], expected?: string];
interface Template {
  match: RegExp;
  title: (goal: string) => string;
  summary: (goal: string) => string;
  assumptions: string[];
  duration: string;
  phases: { title: string; description: string; tasks: T[] }[];
  clarify?: Clarification;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (goal: string) => goal.trim().replace(/[.!?]+$/, "").replace(/^i (want|would like|need) to /i, "");

const TEMPLATES: Template[] = [
  {
    match: /\b(business|brand|startup|company|shop|store|sell|product|clothing|fashion|food|catering|freelanc)/i,
    title: (g) => cap(clean(g)),
    summary: (g) => `Get from the idea "${clean(g)}" to a first small offer that real people can respond to.`,
    assumptions: [
      "You are starting part-time with a small budget.",
      "You want to test demand before spending much money.",
    ],
    duration: "Roughly 3–6 weeks part-time (estimate)",
    clarify: {
      question: "What kind of business are you thinking about?",
      options: ["Clothing or fashion", "Food", "An online service", "Not sure yet"],
    },
    phases: [
      {
        title: "Shape the idea",
        description: "Decide who it is for and what you will offer first.",
        tasks: [
          ["List three businesses you admire in this space", "Write down three businesses similar to yours and one thing you like about each one's products or positioning.", 5, ["Open a notes app", "Write three names", "Add one sentence about each"], "A short list you can refer back to."],
          ["Write down three types of customers who might buy from you", "Describe each customer in one sentence: who they are and what problem you solve for them.", 10, [], "Three one-line customer descriptions."],
          ["Describe your first offer in one sentence", "Pick one product or service to start with and describe it in a sentence a friend would understand.", 10],
        ],
      },
      {
        title: "Test demand",
        description: "Check that people want it before investing heavily.",
        tasks: [
          ["Talk to five potential customers", "Ask about how they currently solve the problem. Listen more than you pitch.", 60, ["Pick five people who match your customer descriptions", "Message each one", "Note what they say in their own words"]],
          ["Estimate your costs for a first small batch", "List what you would need to produce or deliver ten units and what each item costs.", 30],
          ["Set a test price", "Choose a price that covers your costs and write down why you picked it. Treat it as a guess to test.", 15],
        ],
      },
      {
        title: "Make the first sale",
        description: "Put a real offer in front of people.",
        tasks: [
          ["Create a simple offer post or page", "One photo or description, the price, and how to order.", 45],
          ["Share the offer with people you know", "Send it to your contacts and anyone from your customer conversations.", 20],
          ["Write down what you learned", "Note what people asked, what they bought, and what you would change next time.", 15],
        ],
      },
    ],
  },
  {
    match: /\b(learn|study|course|skill|ui|ux|design|code|coding|programming|language|python|javascript)\b/i,
    title: (g) => cap(clean(g)),
    summary: (g) => `Build a steady practice routine for "${clean(g)}" and finish one small project that proves the skill.`,
    assumptions: ["You are a beginner.", "You can practise for about 30 minutes most days."],
    duration: "Roughly 4–8 weeks of regular practice (estimate)",
    phases: [
      {
        title: "Get oriented",
        description: "Choose where to learn from and set up your tools.",
        tasks: [
          ["Write down why you want this skill", "One or two sentences on what you want to be able to do. This helps you pick the right resources.", 5],
          ["Choose one beginner resource", "Pick a single free course, book or video series and commit to it for two weeks.", 20],
          ["Set up the tools you need", "Install or sign up for whatever the resource asks you to use.", 30],
        ],
      },
      {
        title: "Practise the basics",
        description: "Short, regular sessions beat occasional long ones.",
        tasks: [
          ["Complete the first lesson", "Work through the first lesson and do any exercises it includes.", 30],
          ["Schedule three practice sessions this week", "Put three 30-minute blocks in your calendar.", 5],
          ["Recreate one small example on your own", "Without looking, rebuild something the lesson showed you.", 45],
        ],
      },
      {
        title: "Build something small",
        description: "Apply the skill to a project you care about.",
        tasks: [
          ["Pick a tiny project idea", "Something you could finish in a week, related to your reason for learning.", 15],
          ["Build a first rough version", "Aim for done, not perfect.", 120],
          ["Ask one person for feedback", "Share it and ask what is unclear or could be better.", 15],
        ],
      },
    ],
  },
  {
    match: /\b(portfolio|website|site|landing page|blog)\b/i,
    title: (g) => cap(clean(g)),
    summary: () => "Publish a simple site that shows your best work and how to contact you.",
    assumptions: ["You already have some work to show.", "A simple one-page site is enough to start."],
    duration: "Roughly 1–3 weeks part-time (estimate)",
    phases: [
      {
        title: "Gather your work",
        description: "Decide what to show.",
        tasks: [
          ["List your five strongest pieces of work", "Write their names and one line on why each is good.", 10],
          ["Write a two-sentence introduction", "Who you are and the kind of work you want more of.", 15],
        ],
      },
      {
        title: "Build the site",
        description: "Keep the first version simple.",
        tasks: [
          ["Choose a site builder or template", "Pick one free or low-cost option and stop comparing after 20 minutes.", 20],
          ["Add your work and introduction", "Put the five pieces and your intro on one page.", 90],
          ["Add a clear way to contact you", "An email address or form that you check regularly.", 10],
        ],
      },
      {
        title: "Publish and share",
        description: "Get it in front of people.",
        tasks: [
          ["Check the site on your phone", "Fix anything that is hard to read or tap.", 15],
          ["Publish and share the link with three people", "Ask each for one piece of feedback.", 15],
        ],
      },
    ],
  },
  {
    match: /\b(event|conference|party|wedding|meetup|workshop|church|program|programme)\b/i,
    title: (g) => cap(clean(g)),
    summary: () => "Plan the event with clear owners, a budget and a timeline so the day runs smoothly.",
    assumptions: ["You have a rough date in mind.", "A small team or volunteers can help."],
    duration: "Depends on the event date",
    phases: [
      {
        title: "Define the event",
        description: "Agree on the basics before booking anything.",
        tasks: [
          ["Write the purpose of the event in one sentence", "What should attendees leave with?", 5],
          ["Estimate the number of attendees", "Write a low and a high guess.", 10],
          ["Draft a simple budget", "List the main costs: venue, food, equipment, materials.", 30],
        ],
      },
      {
        title: "Book and organise",
        description: "Lock in the things with long lead times first.",
        tasks: [
          ["Shortlist three venues", "Check capacity, cost, and availability on your date.", 60],
          ["Draft the programme", "A rough timeline for the day with session lengths.", 30],
          ["Assign owners for key tasks", "Who handles registration, food, and equipment?", 20],
        ],
      },
      {
        title: "Run the event",
        description: "Prepare for the day and follow up afterwards.",
        tasks: [
          ["Send invitations or announcements", "Include date, place, and how to register.", 30],
          ["Do a final checklist two days before", "Confirm venue, speakers, food and equipment.", 30],
          ["Collect feedback afterwards", "Ask attendees one or two short questions.", 20],
        ],
      },
    ],
  },
  {
    match: /\b(youtube|video|podcast|content|tiktok|instagram|channel|vlog)\b/i,
    title: (g) => cap(clean(g)),
    summary: () => "Plan, record and publish one piece of content, then learn from how it does.",
    assumptions: ["You will record with a phone.", "The first video does not need to be perfect."],
    duration: "Roughly 1–2 weeks part-time (estimate)",
    phases: [
      {
        title: "Plan",
        description: "Decide what the video is about.",
        tasks: [
          ["Write three video ideas", "One line each. Pick the one you would most enjoy making.", 10],
          ["Outline the video in five bullet points", "Hook, three main points, ending.", 20],
        ],
      },
      {
        title: "Make it",
        description: "Record and edit a simple version.",
        tasks: [
          ["Record a rough take", "Use your phone. Good light and clear sound matter more than gear.", 45],
          ["Edit to the essentials", "Cut pauses and mistakes; add a title.", 60],
        ],
      },
      {
        title: "Publish",
        description: "Share it and learn.",
        tasks: [
          ["Write a title and description", "Say clearly what the viewer gets.", 15],
          ["Publish and share with five people", "Ask what kept their attention and where they lost interest.", 15],
        ],
      },
    ],
  },
  {
    match: /\b(exam|test|waec|jamb|neco|gce|ielts|toefl|revision|revise|assignment|thesis|project work)\b/i,
    title: (g) => cap(clean(g)),
    summary: () => "Cover the syllabus with a realistic revision schedule and practise under exam conditions.",
    assumptions: ["You know the exam date.", "You have access to past questions or a syllabus."],
    duration: "Depends on your exam date",
    phases: [
      {
        title: "Map what to cover",
        description: "Know what is on the exam.",
        tasks: [
          ["List the topics on the syllabus", "Write each topic and mark the ones you feel weakest in.", 20],
          ["Find past questions for one subject", "Gather at least one past paper.", 20],
        ],
      },
      {
        title: "Revise",
        description: "Short, focused sessions on weak topics first.",
        tasks: [
          ["Draft a weekly revision timetable", "Put weak topics early in the week.", 20],
          ["Do one 25-minute session on your weakest topic", "Read, then close the book and write what you remember.", 25],
        ],
      },
      {
        title: "Practise",
        description: "Test yourself before the real thing.",
        tasks: [
          ["Answer one past paper under timed conditions", "Use the real time limit.", 120],
          ["Review your mistakes", "Write down why each wrong answer was wrong.", 30],
        ],
      },
    ],
  },
];

const GENERIC: Template = {
  match: /.*/,
  title: (g) => cap(clean(g)).slice(0, 80),
  summary: (g) => `Turn "${clean(g)}" into a short list of concrete actions and finish the first one today.`,
  assumptions: ["You are starting from scratch.", "You can spend a little time on this most days."],
  duration: "Depends on the scope (estimate)",
  phases: [
    {
      title: "Get clear",
      description: "Decide what finished looks like.",
      tasks: [
        ["Write what 'done' looks like in one sentence", "Describe the result you want, as specifically as you can.", 5],
        ["List everything you think is involved", "A quick brain-dump. Don't organise it yet.", 10],
        ["Circle the three most important items", "These become your next tasks.", 5],
      ],
    },
    {
      title: "Make progress",
      description: "Work through the important items.",
      tasks: [
        ["Do the first important item", "Start with the smallest useful piece of it.", 30],
        ["Do the second important item", "Same approach: smallest useful piece first.", 30],
        ["Review what's left", "Cross off what no longer matters and add anything new.", 10],
      ],
    },
  ],
};

const VAGUE = /^(start a business|learn a new skill|build a portfolio|plan an event|get fit|business|learn|study)$/i;

export function demoPlan(goal: string, opts: { allowClarification: boolean; answer?: string }): PlanResult {
  const g = clean(goal);
  const text = opts.answer ? `${g} ${opts.answer}` : g;
  const tpl = TEMPLATES.find((t) => t.match.test(text)) ?? GENERIC;

  if (opts.allowClarification && VAGUE.test(g.trim())) {
    const clarification = tpl.clarify ?? {
      question: "What would you like to have achieved when this is done?",
      options: [],
    };
    return { kind: "clarification", clarification };
  }

  let n = 0;
  const tasks: PlanTask[] = [];
  let lastOfPrevPhase: string | null = null;
  const phases = tpl.phases.map((p, pi) => {
    const phaseId = `p${pi + 1}`;
    p.tasks.forEach(([title, description, mins, steps, expected], i) => {
      const id = `t${++n}`;
      tasks.push({
        id,
        phase_id: phaseId,
        title,
        description,
        expected_result: expected ?? null,
        steps: steps ?? [],
        // A phase starts once the previous phase's last task is done.
        depends_on: i === 0 && lastOfPrevPhase ? [lastOfPrevPhase] : [],
        estimated_minutes: mins,
        completion_criteria: null,
      });
    });
    lastOfPrevPhase = tasks[tasks.length - 1].id;
    return { id: phaseId, title: p.title, description: p.description };
  });

  const assumptions = [...tpl.assumptions];
  if (opts.answer) assumptions.unshift(`You said: ${opts.answer.slice(0, 120)}.`);

  const plan: Plan = {
    project_title: tpl.title(opts.answer && tpl.clarify ? `${g} (${opts.answer})` : g),
    goal_summary: tpl.summary(g),
    assumptions,
    phases,
    tasks,
    recommended_first_task_id: tasks[0].id,
    estimated_duration: tpl.duration,
  };
  return { kind: "plan", plan };
}

export function demoSimplify(task: TaskContext, action: SimplifyAction): SimplifyResult {
  const t = task.title.replace(/[.]+$/, "");
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  const step = (title: string, description: string, m: number | null) => ({ title, description, estimated_minutes: m });
  const firstStep = step(`Spend 5 minutes on the very first part of: ${lower}`, "Set a short timer and only do the opening move. Stop when it rings if you want to.", 5);

  switch (action) {
    case "breakdown":
    case "too_much":
      return {
        explanation:
          action === "too_much"
            ? "Here is a smaller version of this task with just the essentials."
            : "Here is the task split into smaller steps you can do one at a time.",
        steps: [
          step(`Gather what you need to ${lower}`, "Open the apps, files or materials you will use.", 5),
          step(`Do a rough first version`, "Aim for something that exists, not something perfect.", 20),
          step(`Check it and fix the obvious gaps`, "Read it through once and fix anything that is clearly missing.", 10),
        ].slice(0, action === "too_much" ? 2 : 3),
        single_action: null,
        already_small: false,
      };
    case "explain":
      return {
        explanation: `In plain terms: "${t}" means ${task.description ? task.description.charAt(0).toLowerCase() + task.description.slice(1) : "doing the smallest useful version of this step"}. You are finished when you have something you could show someone.`,
        steps: [],
        single_action: null,
        already_small: false,
      };
    case "example":
      return {
        explanation: `Example: if the task were "List three clothing brands you admire", a finished version might be three names, each with one sentence on what you like about them. Apply the same idea here: a short, concrete result for "${t}".`,
        steps: [],
        single_action: null,
        already_small: false,
      };
    case "stuck":
      return {
        explanation: "Being stuck often means the next move isn't clear. Try a very small first move to get going again.",
        steps: [],
        single_action: firstStep,
        already_small: false,
      };
    case "ten_minutes":
      return {
        explanation: "Here is something useful you can finish in about 10 minutes.",
        steps: [],
        single_action: step(`Draft the first part of: ${lower}`, "Work for 10 minutes and write down where you stopped.", 10),
        already_small: false,
      };
    case "first_step":
    case "smaller":
    default:
      return { explanation: "Start with this smaller action.", steps: [], single_action: firstStep, already_small: false };
  }
}
