import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useTheme } from '../contexts/ThemeContext';

interface MobileShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function MobileShell({ children, showNav = true }: MobileShellProps) {
  const c = useTheme();
  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ background: c.bgShell }}
    >
      <div
        data-mobile-shell="true"
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        style={{
          background: c.bg,
          fontFamily: 'Inter, sans-serif',
          transition: 'background 0.25s',
        }}
      >
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden ${showNav ? 'pb-32' : ''}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
