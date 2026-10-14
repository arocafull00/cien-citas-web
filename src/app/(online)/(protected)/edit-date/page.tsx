import { Suspense } from 'react';
import { EditDateRoute } from '@/components/date-form';
export default function EditDatePage() {
  return (
    <Suspense>
      <EditDateRoute />
    </Suspense>
  );
}
