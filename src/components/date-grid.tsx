'use client';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { DATE_CATEGORIES } from '@/constants/dates';
import type { DateEntry } from '@/lib/types';
import { VirtualDateList } from './virtual-date-list';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { handleDateNavigation, type DateNavigation } from '@/lib/date-navigation';

export function filterDates(dates: DateEntry[], filter: string, query: string) {
  const search = query.trim().toLocaleLowerCase('es');
  return dates.filter(date =>
    (filter === 'Todas' || (filter === 'Pendientes' ? !date.completed : filter === 'Hechas' ? date.completed : date.category === filter)) &&
    (!search || `${date.title} ${date.description}`.toLocaleLowerCase('es').includes(search)),
  );
}

const DateResults = memo(function DateResults({ dates, filter, query, scope, readonly, navigate }: { dates: DateEntry[]; filter: string; query: string; scope: string; readonly: boolean; navigate?: DateNavigation }) {
  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);
  const indexed = useMemo(() => dates.map(date => ({ date, text: `${date.title} ${date.description}`.toLocaleLowerCase('es') })), [dates]);
  const filtered = useMemo(() => {
    const search = deferredQuery.trim().toLocaleLowerCase('es');
    return indexed.filter(({ date, text }) => (deferredFilter === 'Todas' || (deferredFilter === 'Pendientes' ? !date.completed : deferredFilter === 'Hechas' ? date.completed : date.category === deferredFilter)) && (!search || text.includes(search))).map(({ date }) => date);
  }, [indexed, deferredQuery, deferredFilter]);
  return <VirtualDateList dates={filtered} scope={scope} readonly={readonly} navigate={navigate} criteria={`${deferredFilter}:${deferredQuery}`} />;
});
function readPreferences(scope: string) {
  try { const value = JSON.parse(sessionStorage.getItem(`100citas:feed:${scope}`) || '{}'); return { query: typeof value.query === 'string' ? value.query : '', filter: ['Todas', 'Pendientes', 'Hechas', ...DATE_CATEGORIES].includes(value.filter) ? value.filter as string : 'Todas' }; }
  catch { return { query: '', filter: 'Todas' }; }
}
export const DateGrid = memo(function DateGrid({ dates, greeting, scope, readonly = false, refresh, navigate }: { dates: DateEntry[]; greeting: string; scope: string; readonly?: boolean; refresh?: () => Promise<void>; navigate?: DateNavigation }) {
  const [preferences, setPreferences] = useState(() => readPreferences(scope));
  const { query, filter } = preferences;
  const setQuery = (query: string) => setPreferences(value => ({ ...value, query }));
  const setFilter = (filter: string) => setPreferences(value => ({ ...value, filter }));
  useEffect(() => { try { sessionStorage.setItem(`100citas:feed:${scope}`, JSON.stringify(preferences)); } catch {} }, [scope, preferences]);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef<number | null>(null);
  const { completed, total } = useMemo(() => ({ completed: dates.filter(d => d.completed).length, total: 100 + dates.filter(d => d.isCustom).length }), [dates]);
  async function update() { if (!refresh || refreshing) return; setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } }
  return <>
    <header className="feed-header"><div className="greeting-row"><p className="greeting">Hola, {greeting}</p></div>
      <div className="feed-title"><h1>{completed} citas completadas</h1>{!readonly ? <a className="add-button" href="/create-date" aria-label="Crear una cita" onClick={event => handleDateNavigation(event, '/create-date', navigate)}><Plus size={26} /></a> : null}</div>
      <Progress className="progress-track" value={completed} max={total} aria-label="Citas completadas" /><p className="progress-caption">{completed} de {total} momentos juntos</p>
      <label className="search-box"><Search size={18} /><Input className="h-auto border-0 p-0 shadow-none focus-visible:ring-0" type="search" aria-label="Buscar citas" placeholder="Buscad vuestro próximo momento…" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </header>
    <div className="feed-filters">
      <div className="filters" aria-label="Filtrar citas">{['Todas', 'Pendientes', 'Hechas', ...DATE_CATEGORIES].map(value => <Button key={value} type="button" variant="ghost" size="unstyled" aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</Button>)}</div>
    </div>
    <main className="feed" onTouchStart={event => { touch.current = window.scrollY <= 0 ? event.touches[0].clientY : null; }} onTouchEnd={event => { const start = touch.current; touch.current = null; if (start !== null && window.scrollY <= 0 && event.changedTouches[0].clientY - start > 90) void update(); }}>
      <DateResults dates={dates} filter={filter} query={query} scope={scope} readonly={readonly} navigate={navigate} />
      <Button variant="ghost" size="unstyled" className="text-button reset-date-filters" onClick={() => setPreferences({ query: '', filter: 'Todas' })} hidden={filter === 'Todas' && !query}>Ver todas las citas</Button>
    </main>
  </>;
});
