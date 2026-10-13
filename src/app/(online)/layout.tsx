import { ClerkProvider } from '@clerk/nextjs';
import { AppProvider } from '@/components/app-provider';
export default function OnlineLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><AppProvider>{children}</AppProvider></ClerkProvider>;
}
