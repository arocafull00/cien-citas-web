import { Suspense } from 'react';
import { CompleteDateRoute } from '@/components/complete-date-form';
export default function CompleteDatePage() {
  return (
    <Suspense>
      <CompleteDateRoute />
    </Suspense>
  );
}
