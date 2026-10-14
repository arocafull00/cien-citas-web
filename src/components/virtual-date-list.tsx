'use client';
import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { DateEntry } from '@/lib/types';
import { DateCard, type DateNavigation } from './date-card';

const GAP = 10;
const COLUMNS = 2;
export const VirtualDateList = memo(function VirtualDateList({
  dates,
  criteria,
  scope,
  readonly,
  navigate,
}: {
  dates: DateEntry[];
  criteria: string;
  scope: string;
  readonly: boolean;
  navigate?: DateNavigation;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ width: 358, margin: 0 });
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const rowCount = Math.ceil(dates.length / COLUMNS);
  const rowHeight = Math.max(geometry.width <= 318 ? 180 : 200, (geometry.width - GAP) / COLUMNS);
  const getItemKey = useCallback((index: number) => dates[index * COLUMNS].id, [dates]);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      // Keep keyboard focus mounted when its row leaves the viewport.
      if (focusedRow !== null && focusedRow < rowCount && !indexes.includes(focusedRow))
        indexes.push(focusedRow);
      return indexes.sort((a, b) => a - b);
    },
    [focusedRow, rowCount],
  );
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    getItemKey,
    gap: GAP,
    overscan: 3,
    scrollMargin: geometry.margin,
    rangeExtractor,
    initialRect: { width: 390, height: 844 },
  });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = rect.width;
      const margin = Math.round(rect.top + window.scrollY);
      setGeometry((previous) =>
        previous.width === width && previous.margin === margin ? previous : { width, margin },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const header = element.closest('.with-nav')?.querySelector('.feed-header');
    if (header) observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);
  const previousCriteria = useRef(criteria);
  useEffect(() => {
    if (previousCriteria.current === criteria) return;
    previousCriteria.current = criteria;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [criteria]);
  return (
    <div ref={container}>
      {!dates.length ? (
        <div className="empty-state" role="status">
          <p>No hay citas con esta búsqueda.</p>
        </div>
      ) : (
        <div
          className="virtual-date-list"
          role="list"
          aria-label="Citas"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              className="virtual-date-row"
              role="presentation"
              style={{
                height: rowHeight,
                transform: `translateY(${row.start - geometry.margin}px)`,
              }}
              onFocusCapture={() => setFocusedRow(row.index)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusedRow(null);
              }}
            >
              {dates
                .slice(row.index * COLUMNS, row.index * COLUMNS + COLUMNS)
                .map((date, column) => (
                  <div
                    key={date.id}
                    role="listitem"
                    aria-setsize={dates.length}
                    aria-posinset={row.index * COLUMNS + column + 1}
                  >
                    <DateCard date={date} scope={scope} readonly={readonly} navigate={navigate} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
