import { ThemeProvider } from './ThemeProvider';
import { NotificationProvider } from '@/context/NotificationContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </ThemeProvider>
  );
}
