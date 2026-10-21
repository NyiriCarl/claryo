import { useNavigate } from 'react-router';
import { ListChecks, Play, Target } from 'lucide-react';
import { Button } from '../components/ui';
import { Lockup } from '../components/Logo';
import { usePrefs } from '../store/prefs';
import { config } from '../config';

const POINTS = [
  { icon: Target, text: 'Describe a goal in your own words.' },
  { icon: ListChecks, text: 'Get a short, practical plan with one clear first step.' },
  { icon: Play, text: 'Start right away and see your progress add up.' },
];

/** Screen 02: one welcome screen, no long tutorial. */
export default function Welcome() {
  const navigate = useNavigate();
  const markSeen = usePrefs((s) => s.markWelcomeSeen);

  return (
    <main tabIndex={-1} className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas px-5 pb-8 safe-top outline-none">
      <div className="pt-6">
        <Lockup size={32} />
      </div>
      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="t-display text-ink">Big goals. Clear first steps.</h1>
        <p className="mt-3 t-body text-ink-2">Turn what you want to accomplish into simple actions you can start today.</p>
        <ul className="mt-8 space-y-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
                <Icon size={20} aria-hidden />
              </span>
              <span className="t-body text-ink">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          block
          onClick={() => {
            markSeen();
            navigate('/', { replace: true });
          }}
        >
          Get started
        </Button>
        {config.authProvider !== 'none' && (
          <Button
            block
            variant="secondary"
            onClick={() => {
              markSeen();
              navigate('/auth?mode=signin');
            }}
          >
            I already have an account
          </Button>
        )}
        <p className="text-center t-meta text-ink-3">No account needed to try it. Your projects are saved on this device until you sign up.</p>
      </div>
    </main>
  );
}
