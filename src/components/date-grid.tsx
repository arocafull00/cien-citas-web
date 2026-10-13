'use client';
import { useState } from 'react';
import { Check, Search, Plus, RefreshCw } from 'lucide-react';
import { DATE_CATEGORIES, type DateCategory } from '@/constants/dates';
import { CATEGORY_CARD_THEME, getCardBackgroundForEntry, formatDateNumber } from '@/constants/date-card';
import type { DateEntry } from '@/lib/types';
import { CachedImage } from './cached-image';

export function filterDates(dates: DateEntry[], filter: string, query: string) {
  const search = query.trim().toLocaleLowerCase('es');
  return dates.filter(date =>
    (filter === 'Todas' || (filter === 'Pendientes' ? !date.completed : filter === 'Hechas' ? date.completed : date.category === filter)) &&
    (!search || `${date.title} ${date.description}`.toLocaleLowerCase('es').includes(search)),
  );
}
export function DateGrid({ dates, greeting, scope, readonly = false, refresh }: { dates: DateEntry[]; greeting: string; scope: string; readonly?: boolean; refresh?: () => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [refreshing, setRefreshing] = useState(false);
  const completed = dates.filter(d => d.completed).length;
  const total = 100 + dates.filter(d => d.isCustom).length;
  const filtered = filterDates(dates, filter, query);
  const LinkComponent = 'a';
  return <>
    <header className="feed-header"><div className="greeting-row"><p className="greeting">Hola, {greeting}</p>{refresh ? <button className="icon-button" aria-label="Actualizar citas" disabled={refreshing} onClick={async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } }}><RefreshCw size={18} className={refreshing ? 'spin' : ''} /></button> : null}</div>
      <div className="feed-title"><h1>{completed} citas completadas</h1>{!readonly ? <a className="add-button" href="/create-date" aria-label="Crear una cita"><Plus size={26} /></a> : null}</div>
      <div className="progress-track" role="progressbar" aria-label="Citas completadas" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${Math.min(100, completed / total * 100)}%` }} /></div><p className="progress-caption">{completed} de {total} momentos juntos</p>
      <label className="search-box"><Search size={18} /><input type="search" aria-label="Buscar citas" placeholder="Buscad vuestro próximo momento…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="filters" aria-label="Filtrar citas">{['Todas', 'Pendientes', 'Hechas', ...DATE_CATEGORIES].map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div>
    </header>
    <main className="feed"><div className="date-grid">{filtered.map(date => {
      const theme = CATEGORY_CARD_THEME[date.category as DateCategory];
      const image = date.completed && date.coverImageUrl ? date.coverImageUrl : getCardBackgroundForEntry(date.id, date.category, date.isCustom);
      return <LinkComponent key={date.id} href={readonly ? `/offline#${encodeURIComponent(`/date/${date.id}`)}` : `/date/${date.id}`} className={`date-card ${date.completed ? 'completed' : ''} ${date.id === '100' ? 'special' : ''}`} style={{ '--number-color': theme?.numberColor, '--pill-bg': theme?.pillBg, '--pill-text': theme?.pillText } as React.CSSProperties}>
        <CachedImage src={image} alt="" scope={scope} className="card-background" loading="lazy" /><div className="card-overlay" />
        <div className="card-content"><div className="card-top"><div><span className="date-number">{date.isCustom ? 'Tuya' : formatDateNumber(date.id)}</span><span className="number-line" />{date.completedAt ? <small>{new Date(date.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}</small> : null}</div>{date.completed ? <span className="completed-check" aria-label="Completada"><Check size={15} /></span> : null}</div><div><h2>{date.title}</h2><span className="category-pill">{date.category}</span></div></div>
      </LinkComponent>;
    })}</div>{!filtered.length ? <div className="empty-state"><p>No hay citas con esta búsqueda.</p><button className="text-button" onClick={() => { setQuery(''); setFilter('Todas'); }}>Ver todas las citas</button></div> : null}</main>
  </>;
}
