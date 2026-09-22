import { useMemo } from 'react';

import type { Category, EntryDraft } from '@/types';
import { diffMinutes, formatMinutes } from '@/utils/time';

import styles from './DaySummary.module.scss';

interface Props {
  rows: EntryDraft[];
  categories: Category[];
}

const DAY = 24 * 60;
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const KIND_META = [
  { kind: 'productive', label: 'Полезное', color: 'var(--productive)' },
  { kind: 'neutral', label: 'Нейтральное', color: 'var(--neutral)' },
  { kind: 'waste', label: 'Впустую', color: 'var(--waste)' },
] as const;

/** Right-hand day overview: 24h ribbon, kind split and per-category totals. */
export function DaySummary({ rows, categories }: Props) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filled = useMemo(
    () => rows.filter((r) => r.start_time && r.end_time && r.category != null),
    [rows],
  );

  const { total, byKind, byCat } = useMemo(() => {
    const kinds = { productive: 0, neutral: 0, waste: 0 };
    const cats = new Map<number, number>();
    let sum = 0;
    for (const r of filled) {
      const m = diffMinutes(r.start_time, r.end_time);
      const cat = catById.get(r.category as number);
      sum += m;
      if (cat) kinds[cat.kind] += m;
      cats.set(r.category as number, (cats.get(r.category as number) ?? 0) + m);
    }
    const list = [...cats.entries()]
      .map(([id, minutes]) => ({ cat: catById.get(id), minutes }))
      .sort((a, b) => b.minutes - a.minutes);
    return { total: sum, byKind: kinds, byCat: list };
  }, [filled, catById]);

  const index = total ? Math.round((byKind.productive / total) * 100) : 0;

  return (
    <section className={styles.card} aria-label="Итоги дня">
      <div className={styles.head}>
        <h2 className={styles.title}>Итоги дня</h2>
        <span className={styles.index} title="Доля полезного времени">
          {index}%
        </span>
      </div>

      <div className={styles.total}>
        <span className={styles.totalValue}>{formatMinutes(total)}</span>
        <span className={styles.totalHint}>отмечено из 24 ч</span>
      </div>

      {/* 24h ribbon: every interval placed at its real time of day. */}
      <div className={styles.ribbonWrap}>
        <div className={styles.ribbon} role="img" aria-label="Интервалы на шкале суток">
          {filled.map((r, i) => {
            const start = toMin(r.start_time);
            const len = diffMinutes(r.start_time, r.end_time);
            const width = Math.min(len, DAY - start);
            return (
              <span
                key={i}
                className={styles.ribbonSeg}
                style={{
                  left: `${(start / DAY) * 100}%`,
                  width: `${(width / DAY) * 100}%`,
                  background: catById.get(r.category as number)?.color ?? 'var(--neutral)',
                }}
                title={`${r.start_time}–${r.end_time}`}
              />
            );
          })}
        </div>
        <div className={styles.ribbonScale} aria-hidden="true">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.splitBar}>
          {KIND_META.map((k) =>
            byKind[k.kind] > 0 ? (
              <span
                key={k.kind}
                style={{ flexGrow: byKind[k.kind], background: k.color }}
                aria-hidden="true"
              />
            ) : null,
          )}
        </div>
        <ul className={styles.kinds}>
          {KIND_META.map((k) => (
            <li key={k.kind}>
              <span className={styles.dot} style={{ background: k.color }} />
              <span className={styles.kindLabel}>{k.label}</span>
              <span className={styles.kindValue}>{formatMinutes(byKind[k.kind])}</span>
            </li>
          ))}
        </ul>
      </div>

      {byCat.length > 0 && (
        <div className={styles.cats}>
          <h3 className={styles.eyebrow}>По категориям</h3>
          <ul className={styles.catList}>
            {byCat.map(({ cat, minutes }) => (
              <li key={cat?.id ?? 'none'} className={styles.catRow}>
                <span className={styles.catName}>
                  <span className={styles.dot} style={{ background: cat?.color }} />
                  {cat ? `${cat.icon} ${cat.name}` : '—'}
                </span>
                <span className={styles.catValue}>{formatMinutes(minutes)}</span>
                <span className={styles.catBar}>
                  <span
                    style={{
                      width: `${total ? (minutes / total) * 100 : 0}%`,
                      background: cat?.color,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
