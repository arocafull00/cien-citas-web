import { CompleteDateForm } from '@/components/complete-date-form';
import { notFound } from 'next/navigation';
export default async function CompleteDatePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) { const { id } = await searchParams; if (!id) notFound(); return <CompleteDateForm id={id} />; }
