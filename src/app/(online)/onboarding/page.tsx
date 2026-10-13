import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OnboardingScreen } from '@/components/onboarding-screen';
export default async function OnboardingPage() { if (!(await auth()).userId) redirect('/login'); return <OnboardingScreen />; }
