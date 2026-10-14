import { CoupleGate } from '@/components/mobile-shell';
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <CoupleGate>{children}</CoupleGate>;
}
