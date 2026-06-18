import { useEffect, useMemo, useRef, useState } from 'react';

import { useCategories, useDayEntries, useSaveDay } from '@/api/hooks';
import { DayFrame } from '@/components/DayBounds/DayFrame';
import { useDayBounds } from '@/components/DayBounds/useDayBounds';
import { IntervalRow } from '@/components/IntervalRow/IntervalRow';
import type { Category, EntryDraft } from '@/types';
import { validateIntervals } from '@/utils/intervals';
import { diffMinutes, formatMinutes, toHHMM } from '@/utils/time';

import styles from './DayPage.module.scss';

const AUTOSAVE_DELAY = 800;
const todayStr = () => new Date().toISOString().slice(0, 10);

type Row = EntryDraft & { _uid: string };

let uidSeq = 0;
const nextUid = () => `r${(uidSeq += 1)}`;

const emptyRow = (start = ''): Row => ({
  _uid: nextUid(),
  start_time: start,
  end_time: '',
  category: null,
  note: '',
});

const isComplete = (r: EntryDraft) => Boolean(r.start_time && r.end_time && r.category);

/** Sort filled intervals by start time, keep unfinished rows last, ensure one trailing empty. */
function normalize(rows: Row[]): Row[] {
  const complete = rows.filter(isComplete).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const incomplete = rows.filter((r) => !isComplete(r));
  const result = [...complete, ...incomplete];
  const last = result[result.length - 1];
  if (!last || isComplete(last)) result.push(emptyRow(last?.end_time ?? ''));
  return result;
}

export function DayPage() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [editMode, setEditMode] = useState(false);

  const dirtyRef = useRef(false);
  const loadedDateRef = useRef<string | null>(null);
  const rowsEndRef = useRef<HTMLDivElement>(null);
  const prevRowCount = useRef(rows.length);

  const { data: categories = [] } = useCategories();
  const { data: savedEntries } = useDayEntries(date);
  const saveDay = useSaveDay();

  const isPast = date < todayStr();
  const isFuture = date > todayStr();

  const errors = useMemo(() => validateIntervals(rows), [rows]);

  // Category options include archived categories still referenced by entries,
  // so a deleted category's intervals don't show up blank.
  const optionCategories = useMemo<Category[]>(() => {
    const byId = new Map<number, Category>(categories.map((c) => [c.id, c]));
    for (const e of savedEntries ?? []) {
      const d = e.category_detail;
      if (d && !byId.has(d.id)) {
        byId.set(d.id, { ...d, is_archived: true, is_default: false, created_at: '' });
      }
    }
    return [...byId.values()];
  }, [categories, savedEntries]);

  useEffect(() => {
    dirtyRef.current = false;
    setEditMode(false);
  }, [date]);

  // Load saved entries once per day.
  useEffect(() => {
    if (!savedEntries || loadedDateRef.current === date) return;
    loadedDateRef.current = date;

    if (savedEntries.length === 0) {
      setRows([emptyRow()]);
      return;
    }
    const loaded: Row[] = savedEntries.map((e) => ({
      _uid: nextUid(),
      start_time: toHHMM(e.start_time),
      end_time: toHHMM(e.end_time),
      category: e.category,
      note: e.note,
    }));
    setRows(normalize(loaded));
  }, [savedEntries, date]);

  // Scroll to the newly auto-added interval so entry stays in view.
  useEffect(() => {
    if (rows.length > prevRowCount.current) {
      rowsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevRowCount.current = rows.length;
  }, [rows.length]);

  const persist = (current: Row[]) => {
    saveDay.mutate(
      { date, entries: current.filter(isComplete) },
      { onSuccess: () => (dirtyRef.current = false) },
    );
  };

  useEffect(() => {
    if (!dirtyRef.current || errors.size > 0) return;
    const timer = setTimeout(() => persist(rows), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, errors]);

  const handleChange = (index: number, patch: Partial<EntryDraft>) => {
    dirtyRef.current = true;
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      // Continue the timeline: fill the next row's empty start with this end.
      if (patch.end_time && index + 1 < next.length && !next[index + 1].start_time) {
        next[index + 1] = { ...next[index + 1], start_time: patch.end_time };
      }
      return normalize(next);
    });
  };

  const handleRemove = (index: number) => {
    dirtyRef.current = true;
    setRows((prev) => normalize(prev.filter((_, i) => i !== index)));
  };

  const totalMinutes = useMemo(
    () =>
      rows.reduce((sum, r) => (isComplete(r) ? sum + diffMinutes(r.start_time, r.end_time) : sum), 0),
    [rows],
  );

  const firstStart = useMemo(() => {
    const starts = rows.filter(isComplete).map((r) => r.start_time).sort();
    return starts[0];
  }, [rows]);

  const bounds = useDayBounds(date, firstStart);

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const jumpToForm = () => {
    rowsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const filledRows = rows.filter(isComplete);

  const dateBar = (
    <div className={styles.dateBar}>
      <button type="button" onClick={() => shiftDay(-1)} aria-label="Предыдущий день">
        ←
      </button>
      <input
        type="date"
        value={date}
        max={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Выбор даты"
      />
      <button
        type="button"
        onClick={() => shiftDay(1)}
        disabled={!isPast}
        aria-label="Следующий день"
      >
        →
      </button>
    </div>
  );

  // Future day — can't be logged yet.
  if (isFuture) {
    return (
      <div className={styles.page}>
        {dateBar}
        <div className={styles.futureBox}>
          <span className={styles.futureIcon}>🗓️</span>
          <p className={styles.futureText}>Это будущий день — заполнить пока нельзя.</p>
        </div>
      </div>
    );
  }

  // Read-only view for a past day (until the user taps "Редактировать").
  if (isPast && !editMode) {
    const catById = new Map(optionCategories.map((c) => [c.id, c]));
    return (
      <div className={styles.page}>
        {dateBar}

        <div className={styles.readHeader}>
          <span className={styles.readBadge}>Прошедший день</span>
          <button type="button" className={styles.editBtn} onClick={() => setEditMode(true)}>
            Редактировать
          </button>
        </div>

        <div className={styles.sleepCard} aria-label="Подъём, отбой, сон">
          <div className={styles.sleepRow}>
            <span className={styles.sleepLabel}>🌅 Подъём</span>
            <span className={styles.sleepValue}>{bounds.wake || '—'}</span>
          </div>
          <div className={styles.sleepRow}>
            <span className={styles.sleepLabel}>🌙 Отбой</span>
            <span className={styles.sleepValue}>{bounds.sleep || '—'}</span>
          </div>
          <div className={`${styles.sleepRow} ${styles.sleepTotal}`}>
            <span className={styles.sleepLabel}>💤 Сон</span>
            <span className={styles.sleepValue}>
              {bounds.sleepMinutes > 0 ? (
                <>
                  {formatMinutes(bounds.sleepMinutes)}
                  {bounds.prevSleep && bounds.wake && (
                    <span className={styles.sleepRange}> · {bounds.prevSleep}–{bounds.wake}</span>
                  )}
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>

        {filledRows.length === 0 ? (
          <p className={styles.muted}>За этот день записей нет.</p>
        ) : (
          <ul className={styles.readList}>
            {filledRows.map((r) => {
              const cat = r.category != null ? catById.get(r.category) : undefined;
              return (
                <li
                  key={r._uid}
                  className={styles.readItem}
                  style={{ borderLeftColor: cat?.color ?? 'var(--border)' }}
                >
                  <span className={styles.readTime}>
                    {r.start_time}–{r.end_time}
                  </span>
                  <span className={styles.readCat}>
                    {cat ? `${cat.icon} ${cat.name}` : '—'}
                  </span>
                  <span className={styles.readDur}>
                    {formatMinutes(diffMinutes(r.start_time, r.end_time))}
                  </span>
                  {r.note && <span className={styles.readNote}>{r.note}</span>}
                </li>
              );
            })}
          </ul>
        )}

        <p className={styles.total}>
          Всего за день: <strong>{formatMinutes(totalMinutes)}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {dateBar}

      {isPast && editMode && (
        <div className={styles.readHeader}>
          <span className={styles.readBadge}>✏️ Режим редактирования</span>
          <button type="button" className={styles.editBtn} onClick={() => setEditMode(false)}>
            ← К просмотру
          </button>
        </div>
      )}

      <DayFrame bounds={bounds} />

      <section className={styles.rows} aria-label="Интервалы дня">
        {rows.map((row, i) => (
          <IntervalRow
            key={row._uid}
            index={i}
            draft={row}
            categories={optionCategories}
            error={errors.get(i)}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ))}
        <div ref={rowsEndRef} />
      </section>

      <p className={styles.total}>
        Заполнено за день: <strong>{formatMinutes(totalMinutes)}</strong>
      </p>

      <button type="button" className={styles.jumpBtn} onClick={jumpToForm}>
        К интервалу
      </button>
    </div>
  );
}
