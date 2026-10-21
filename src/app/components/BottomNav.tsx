import { NavLink } from 'react-router';
import { Home, FolderOpen, Zap, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'motion/react';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/projects', icon: FolderOpen, label: 'Goals' },
  { to: '/momentum', icon: Zap, label: 'Momentum' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const c = useTheme();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: c.navBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${c.navBorder}`,
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      <div className="flex items-center justify-around px-3 pt-2 pb-7">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all"
          >
            {({ isActive }) => (
              <>
                <motion.div
                  animate={{
                    scale: isActive ? 1.08 : 1,
                    background: isActive ? 'rgba(79,70,229,0.18)' : 'rgba(79,70,229,0)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="w-11 h-9 flex items-center justify-center rounded-xl"
                >
                  <Icon
                    size={20}
                    color={isActive ? '#4F46E5' : c.textSecondary}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    fill={label === 'Momentum' && isActive ? '#4F46E5' : 'none'}
                  />
                </motion.div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#4F46E5' : c.textSecondary,
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: isActive ? '0.01em' : '0',
                    transition: 'color 0.2s, font-weight 0.2s',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}