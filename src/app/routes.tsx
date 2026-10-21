import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import ActionScreen from './pages/ActionScreen';
import ExecutionMode from './pages/ExecutionMode';
import Projects from './pages/Projects';
import Momentum from './pages/Momentum';
import Profile from './pages/Profile';

export const router = createBrowserRouter([
  { path: '/auth', Component: Auth },
  { path: '/auth/callback', Component: AuthCallback },
  { path: '/onboarding', Component: Onboarding },
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'action/:goalId', Component: ActionScreen },
      { path: 'execute/:goalId', Component: ExecutionMode },
      { path: 'projects', Component: Projects },
      { path: 'momentum', Component: Momentum },
      { path: 'profile', Component: Profile },
    ],
  },
]);