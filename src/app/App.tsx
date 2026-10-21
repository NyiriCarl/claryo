import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        toastOptions={{ duration: 3000 }}
      />
    </ThemeProvider>
  );
}