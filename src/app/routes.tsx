import { createBrowserRouter, createHashRouter } from 'react-router';
import { config } from './config';
import { AppShell } from './AppShell';
import Welcome from './pages/Welcome';
import AuthPage from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home';
import NewProject from './pages/NewProject';
import ProjectsPage from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';
import TaskHelp from './pages/TaskHelp';
import TaskComplete from './pages/TaskComplete';
import Focus from './pages/Focus';
import ProgressPage from './pages/Progress';
import SettingsPage from './pages/Settings';
import { HelpPage, PrivacyPage, TermsPage } from './pages/InfoPages';
import NotFound from './pages/NotFound';

// Hash URLs let the app run from a static host with no rewrite rules (e.g. a shared preview link).
const createRouter = config.hashRouter ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    Component: AppShell,
    children: [
      { path: '/welcome', Component: Welcome },
      { path: '/auth', Component: AuthPage },
      { path: '/auth/callback', Component: AuthCallback },
      { path: '/', Component: Home },
      { path: '/new', Component: NewProject },
      { path: '/projects', Component: ProjectsPage },
      { path: '/projects/:projectId', Component: ProjectDetail },
      { path: '/projects/:projectId/tasks/:taskId', Component: TaskDetail },
      { path: '/projects/:projectId/tasks/:taskId/help', Component: TaskHelp },
      { path: '/projects/:projectId/tasks/:taskId/done', Component: TaskComplete },
      { path: '/focus/:projectId/:taskId', Component: Focus },
      { path: '/progress', Component: ProgressPage },
      { path: '/settings', Component: SettingsPage },
      { path: '/settings/privacy', Component: PrivacyPage },
      { path: '/settings/terms', Component: TermsPage },
      { path: '/settings/help', Component: HelpPage },
      { path: '*', Component: NotFound },
    ],
  },
]);
