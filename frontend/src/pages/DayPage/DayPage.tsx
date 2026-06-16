import { useEffect, useMemo, useRef, useState } from 'react';

import { useCategories, useDayEntries, useSaveDay } from '@/api/hooks';
import { CategoryDonut, type DonutDatum } from '@/components/charts/CategoryDonut';
import { ChartToggle, type ChartKind } from '@/components/charts/ChartToggle';
import { EntryBars, type EntryBarDatum } from '@/components/charts/EntryBars';
import { DayFrame } from '@/components/DayBounds/DayFrame';
import { useDayBounds } from '@/components/DayBounds/useDayBounds';
import { IntervalRow } from '@/components/IntervalRow/IntervalRow';
import type { EntryDraft } from '@/types';
import { validateIntervals } from '@/utils/intervals';
import { diffMinutes, formatMinutes, toHHMM } from '@/utils/time';

import styles from './DayPage.module.scss';

const AUTOSAVE_DELAY = 800;
const CHART_PREF_KEY = 'tt_day_chart';
const today = () => new Date().toISOString().slice(0, 10);

const emptyRow = (start = ''): EntryDraft => ({
  start_time: start,
  end_time: '',
  category: null,
  note: '',
});

const isComplete = (r: EntryDraft) => Boolean(r.start_time && r.end_time && r.category);

/** Ensure there is exactly one trailing empty row to fill next. */
function withTrailingEmpty(rows: EntryDraft[]): EntryDraft[] {
  const last = rows[rows.length - 1];
  if (!last || isComplete(last)) {
    return [...rows, emptyRow(last?.end_time ?? '')];
  }
  return rows;
}

export function DayPage() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<EntryDraft[]>(() => [emptyRow()]);
  const [chart, setChart] = useState<ChartKind>(
    () => (localStorage.getItem(CHART_PREF_KEY) as ChartKind) || 'donut',
  );

  const dirtyRef = useRef(false);
  const loadedDateRef = useRef<string | null>(null);
  const rowsEndRef = useRef<HTMLDivElement>(null);
  const prevRowCount = useRef(rows.length);

  const { data: categories = [] } = useCategories();
  const { data: savedEntries } = useDayEntries(date);
  const saveDay = useSaveDay();

  const errors = useMemo(() => validateIntervals(rows), [rows]);

  const setChartPref = (kind: ChartKind) => {
    setChart(kind);
    localStorage.setItem(CHART_PREF_KEY, kind);
  };

  useEffect(() => {
    dirtyRef.current = false;
  }, [date]);

  // Load saved entries once per day.
  useEffect(() => {
    if (!savedEntries || loadedDateRef.current === date) return;
    loadedDateRef.current = date;

    if (savedEntries.length === 0) {
      setRows([emptyRow()]);
      return;
    }
    const loaded: EntryDraft[] = savedEntries.map((e) => ({
      id: e.id,
      start_time: toHHMM(e.start_time),
      end_time: toHHMM(e.end_time),
      category: e.category,
      note: e.note,
    }));
    setRows(withTrailingEmpty(loaded));
  }, [savedEntries, date]);

  // Scroll to the newly auto-added interval so entry stays in view.
  useEffect(() => {
    if (rows.length > prevRowCount.current) {
      rowsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevRowCount.current = rows.length;
  }, [rows.length]);

  const persist = (current: EntryDraft[]) => {
    saveDay.mutate(
      { date, entries: current.filter(isComplete) },
      { onSuccess: () => (dirtyRef.current = false) },
    );
  };

  // Debounced autosave — never persist while there are validation errors.
  useEffect(() => {
    if (!dirtyRef.current || errors.size > 0) return;
    const timer = setTimeout(() => persist(rows), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, errors]);

  const handleChange = (index: number, patch: Partial<EntryDraft>) => {
    dirtyRef.current = true;
    setRows((prev) => {
      let next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      // Keep the timeline continuous: next interval starts where this ends.
      if (patch.end_time !== undefined && index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], start_time: patch.end_time };
      }
      // A finished last row spawns a fresh empty one — no manual "add" needed.
      next = withTrailingEmpty(next);
      return next;
    });
  };

  const handleRemove = (index: number) => {
    dirtyRef.current = true;
    setRows((prev) => withTrailingEmpty(prev.filter((_, i) => i !== index)));
  };

  const totalMinutes = useMemo(
    () =>
      rows.reduce((sum, r) => (isComplete(r) ? sum + diffMinutes(r.start_time, r.end_time) : sum), 0),
    [rows],
  );

  const { firstStart, lastEnd } = useMemo(() => {
    const complete = rows.filter(isComplete);
    if (complete.length === 0) return { firstStart: undefined, lastEnd: undefined };
    const starts = complete.map((r) => r.start_time).sort();
    const ends = complete.map((r) => r.end_time).sort();
    return { firstStart: starts[0], lastEnd: ends[ends.length - 1] };
  }, [rows]);

  const bounds = useDayBounds(date, firstStart, lastEnd);

  const donutData: DonutDatum[] = useMemo(() => {
    const map = new Map<number, DonutDatum>();
    for (const r of rows) {
      if (!isComplete(r)) continue;
      const cat = categories.find((c) => c.id === r.category);
      if (!cat) continue;
      const minutes = diffMinutes(r.start_time, r.end_time);
      const existing = map.get(cat.id);
      if (existing) existing.minutes += minutes;
      else map.set(cat.id, { name: cat.name, minutes, color: cat.color });
    }
    return [...map.values()].sort((a, b) => b.minutes - a.minutes);
  }, [rows, categories]);

  const barData: EntryBarDatum[] = useMemo(() => {
    return rows
      .filter(isComplete)
      .map((r) => {
        const cat = categories.find((c) => c.id === r.category);
        return {
          label: r.start_time,
          fullLabel: `${cat?.name ?? ''} · ${r.start_time}–${r.end_time}`,
          minutes: diffMinutes(r.start_time, r.end_time),
          color: cat?.color ?? 'var(--neutral)',
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, categories]);

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const hasData = donutData.length > 0;

  const jumpToForm = () => {
    rowsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.dateBar}>
        <button type="button" onClick={() => shiftDay(-1)} aria-label="Предыдущий день">
          ←
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Выбор даты"
        />
        <button type="button" onClick={() => shiftDay(1)} aria-label="Следующий день">
          →
        </button>
      </div>

      <DayFrame bounds={bounds} />

      <section className={styles.rows} aria-label="Интервалы дня">
        {rows.map((row, i) => (
          <IntervalRow
            key={row.id ?? `new-${i}`}
            index={i}
            draft={row}
            categories={categories}
            error={errors.get(i)}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ))}
        <div ref={rowsEndRef} />
      </section>

      <section className={styles.statsSection} aria-label="Статистика дня">
        <div className={styles.statsHead}>
          <div className={styles.total}>
            <span className={styles.totalLabel}>Заполнено за день</span>
            <strong>{formatMinutes(totalMinutes)}</strong>
          </div>
          {hasData && <ChartToggle value={chart} onChange={setChartPref} />}
        </div>

        {hasData ? (
          <>
            <div className={styles.chart}>
              {chart === 'donut' ? (
                <CategoryDonut data={donutData} />
              ) : (
                <EntryBars data={barData} />
              )}
            </div>
            <ul className={styles.legend}>
              {donutData.map((d) => {
                const pct = totalMinutes ? Math.round((d.minutes / totalMinutes) * 100) : 0;
                return (
                  <li key={d.name} className={styles.legendRow}>
                    <span className={styles.legendName}>
                      <span className={styles.legendDot} style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <div className={styles.legendBar}>
                      <div
                        className={styles.legendFill}
                        style={{ width: `${pct}%`, background: d.color }}
                      />
                    </div>
                    <span className={styles.legendValue}>
                      {formatMinutes(d.minutes)} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className={styles.muted}>Заполни интервалы — здесь появится статистика дня.</p>
        )}
      </section>

      <button type="button" className={styles.jumpBtn} onClick={jumpToForm}>
        К интервалу
      </button>
    </div>
  );
}
