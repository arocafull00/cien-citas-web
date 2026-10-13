'use client';
import { memo } from 'react';
import { Check } from 'lucide-react';
import { CATEGORY_CARD_THEME, getCardBackgroundForEntry, formatDateNumber } from '@/constants/date-card';
import type { DateEntry } from '@/lib/types';
import { CachedImage } from './cached-image';
import { Badge } from './ui/badge';
import { handleDateNavigation, type DateNavigation } from '@/lib/date-navigation';
export type { DateNavigation };
const completedDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
export const DateCard = memo(function DateCard({ date, scope, readonly, navigate }: { date: DateEntry; scope: string; readonly: boolean; navigate?: DateNavigation }) {
  const theme = CATEGORY_CARD_THEME[date.category];
  const image = date.completed && date.coverImageUrl ? date.coverImageUrl : getCardBackgroundForEntry(date.id, date.category, date.isCustom).replace(/\.png$/, '.webp');
  const href = readonly ? `/offline#${encodeURIComponent(`/date/${date.id}`)}` : `/date/${date.id}`;
  return <a href={href} onClick={event => handleDateNavigation(event, href, navigate)} className={`date-card ${date.completed ? 'completed' : ''} ${date.id === '100' ? 'special' : ''}`} style={{ '--number-color': theme.numberColor, '--pill-bg': theme.pillBg, '--pill-text': theme.pillText } as React.CSSProperties}>
    <CachedImage src={image} alt="" scope={scope} className="card-background" loading="lazy" variant="thumbnail" /><div className="card-overlay" />
    <div className="card-content"><div className="card-top"><div><span className="date-number">{date.isCustom ? 'Tuya' : formatDateNumber(date.id)}</span><span className="number-line" />{date.completedAt ? <small>{completedDate.format(new Date(date.completedAt))}</small> : null}</div>{date.completed ? <span className="completed-check" aria-label="Completada"><Check size={15} /></span> : null}</div><div><h2>{date.title}</h2><Badge variant="ghost" className="category-pill">{date.category}</Badge></div></div>
  </a>;
});
