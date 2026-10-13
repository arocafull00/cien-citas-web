import { DateForm } from '@/components/date-form';
import { notFound } from 'next/navigation';
export default async function EditDatePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) { const { id } = await searchParams; if (!id) notFound(); return <DateForm id={id} />; }
