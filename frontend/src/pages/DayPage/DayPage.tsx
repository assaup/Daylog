import { useEffect, useMemo, useRef, useState } from 'react';

import { useCategories, useDayEntries, useSaveDay } from '@/api/hooks';
import { CategoryDonut, type DonutDatum } from '@/components/charts/CategoryDonut';
import { ChartToggle, type ChartKind } from '@/components/charts/ChartToggle';
import { EntryBars, type EntryBarDatum } from '@/components/charts/EntryBars';
import { DayBounds } from '@/components/DayBounds/DayBounds';
import { DayTimeline } from '@/components/DayTimeline/DayTimeline';
import { IntervalRow } from '@/components/IntervalRow/IntervalRow';
import type { EntryDraft } from '@/types';
import { validateIntervals } from '@/utils/intervals';
import { diffMinutes, formatMinutes, toHHMM } from '@/utils/time';

import styles from './DayPage.module.scss';

const DEFAULT_ROWS = 5;
const AUTOSAVE_DELAY = 800;
const CHART_PREF_KEY = 'tt_day_chart';
const today = () => new Date().toISOString().slice(0, 10);

const emptyRow = (start = ''): EntryDraft => ({
  start_time: start,
  end_time: '',
  category: null,
  note: '',
});

function buildInitialRows(): EntryDraft[] {
  return Array.from({ length: DEFAULT_ROWS }, () => emptyRow());
}

const isComplete = (r: EntryDraft) => Boolean(r.start_time && r.end_time && r.category);

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'invalid';

export function DayPage() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<EntryDraft[]>(buildInitialRows);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [chart, setChart] = useState<ChartKind>(
    () => (localStorage.getItem(CHART_PREF_KEY) as ChartKind) || 'donut',
  );

  const dirtyRef = useRef(false);
  // Which date's data is already loaded into the editor. We load from the
  // server only once per date, so the autosave refetch never clobbers the
  // rows the user is actively editing.
  const loadedDateRef = useRef<string | null>(null);

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
    setStatus('idle');
  }, [date]);

  // Load saved entries into the editor once per day (not on every refetch).
  useEffect(() => {
    if (!savedEntries || loadedDateRef.current === date) return;
    loadedDateRef.current = date;

    if (savedEntries.length === 0) {
      setRows(buildInitialRows());
      return;
    }
    const loaded: EntryDraft[] = savedEntries.map((e) => ({
      id: e.id,
      start_time: toHHMM(e.start_time),
      end_time: toHHMM(e.end_time),
      category: e.category,
      note: e.note,
    }));
    while (loaded.length < DEFAULT_ROWS) loaded.push(emptyRow());
    setRows(loaded);
  }, [savedEntries, date]);

  const persist = (current: EntryDraft[]) => {
    setStatus('saving');
    saveDay.mutate(
      { date, entries: current.filter(isComplete) },
      {
        onSuccess: () => {
          dirtyRef.current = false;
          setStatus('saved');
        },
        onError: () => setStatus('dirty'),
      },
    );
  };

  // Debounced autosave — but never persist while there are validation errors.
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (errors.size > 0) {
      setStatus('invalid');
      return;
    }
    const timer = setTimeout(() => persist(rows), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, errors]);

  const handleChange = (index: number, patch: Partial<EntryDraft>) => {
    dirtyRef.current = true;
    setStatus('dirty');
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      // Keep the timeline continuous: the next interval starts where this ends.
      if (patch.end_time !== undefined && index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], start_time: patch.end_time };
      }
      return next;
    });
  };

  const handleRemove = (index: number) => {
    dirtyRef.current = true;
    setStatus('dirty');
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, emptyRow(last?.end_time ?? '')];
    });
  };

  const totalMinutes = useMemo(
    () =>
      rows.reduce((sum, r) => (isComplete(r) ? sum + diffMinutes(r.start_time, r.end_time) : sum), 0),
    [rows],
  );

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
    return [...map.values()];
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

  // Earliest start / latest end of filled intervals — used to bound wake/sleep.
  const { firstStart, lastEnd } = useMemo(() => {
    const complete = rows.filter(isComplete);
    if (complete.length === 0) return { firstStart: undefined, lastEnd: undefined };
    const starts = complete.map((r) => r.start_time).sort();
    const ends = complete.map((r) => r.end_time).sort();
    return { firstStart: starts[0], lastEnd: ends[ends.length - 1] };
  }, [rows]);

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const statusText: Record<SaveStatus, string> = {
    idle: '',
    dirty: 'Не сохранено…',
    saving: 'Сохранение…',
    saved: 'Сохранено ✓',
    invalid: 'Исправь пересечения интервалов',
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

      <section className={styles.summary} aria-label="Подъём и отбой">
        <DayBounds date={date} firstStart={firstStart} lastEnd={lastEnd} />
        <DayTimeline entries={rows} categories={categories} />
        <div className={styles.total}>
          <span className={styles.totalLabel}>Заполнено</span>
          <strong>{formatMinutes(totalMinutes)}</strong>
        </div>
      </section>

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
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.addBtn} onClick={addRow}>
          + Добавить интервал
        </button>
        <span
          className={`${styles.status} ${status === 'invalid' ? styles.statusError : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusText[status]}
        </span>
      </div>

      {barData.length > 0 && (
        <section className={styles.chartSection} aria-label="Диаграмма за день">
          <div className={styles.summaryHead}>
            <h2 className={styles.chartTitle}>Распределение времени</h2>
            <ChartToggle value={chart} onChange={setChartPref} />
          </div>
          <div className={styles.chart}>
            {chart === 'donut' ? <CategoryDonut data={donutData} /> : <EntryBars data={barData} />}
          </div>
        </section>
      )}
    </div>
  );
}
