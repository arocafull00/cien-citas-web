import { DateDetailScreen } from '@/components/date-detail-screen';
export function generateStaticParams() {
  return [];
}
export default async function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DateDetailScreen key={id} id={id} />;
}
