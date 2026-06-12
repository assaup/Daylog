import type { EntryDraft, Category } from '@/types';
import { diffMinutes } from '@/utils/time';

import styles from './DayTimeline.module.scss';

interface Props {
  entries: EntryDraft[];
  categories: Category[];
}

const DAY_MINUTES = 24 * 60;

function minutesFromMidnight(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Horizontal 00:00–24:00 bar coloured by category — "the shape of the day". */
export function DayTimeline({ entries, categories }: Props) {
  const segments = entries
    .filter((e) => e.start_time && e.end_time && e.category)
    .map((e) => {
      const cat = categories.find((c) => c.id === e.category);
      const left = (minutesFromMidnight(e.start_time) / DAY_MINUTES) * 100;
      const width = (diffMinutes(e.start_time, e.end_time) / DAY_MINUTES) * 100;
      return { left, width, color: cat?.color ?? 'var(--neutral)', name: cat?.name ?? '' };
    });

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="img"
        aria-label="Лента дня: распределение интервалов по времени"
      >
        {segments.map((s, i) => (
          <div
            key={i}
            className={styles.segment}
            style={{ left: `${s.left}%`, width: `${s.width}%`, background: s.color }}
            title={s.name}
          />
        ))}
      </div>
      <div className={styles.ticks} aria-hidden="true">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
