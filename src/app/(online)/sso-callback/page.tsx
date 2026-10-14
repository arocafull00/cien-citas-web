'use client';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
export default function Callback() {
  return (
    <main className="status-screen page">
      <span className="spinner" />
      <p>Comenzando vuestra historia…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/onboarding"
        signUpFallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
