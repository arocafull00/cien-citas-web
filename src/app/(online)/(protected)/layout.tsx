import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CoupleGate } from '@/components/mobile-shell';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth()).userId) redirect('/login');
  return <CoupleGate>{children}</CoupleGate>;
}
