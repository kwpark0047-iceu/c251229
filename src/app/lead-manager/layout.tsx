import type { ReactNode } from 'react';
import AccountAccessGuard from '@/components/AccountAccessGuard';

export default function LeadManagerLayout({ children }: { children: ReactNode }) {
  return <AccountAccessGuard>{children}</AccountAccessGuard>;
}
