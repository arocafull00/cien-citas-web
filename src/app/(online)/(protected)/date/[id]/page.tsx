import { DateDetailScreen } from '@/components/date-detail-screen';
export default async function DatePage({ params }: { params: Promise<{ id: string }> }) {
  return <DateDetailScreen id={(await params).id} />;
}
