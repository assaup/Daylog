import { AlertTriangle, BedDouble, Moon, MoonStar, Sunrise } from 'lucide-react';

import { formatMinutes } from '@/utils/time';

import styles from './DayFrame.module.scss';
import type { useDayBounds } from './useDayBounds';

type Bounds = ReturnType<typeof useDayBounds>;

/** Top-of-day frame: yesterday's bedtime, wake, sleep, then tonight's bedtime. */
export function DayFrame({ bounds }: { bounds: Bounds }) {
  return (
    <section className={styles.frame} aria-label="Подъём и отбой">
      <h2 className={styles.title}>Сон и режим</h2>

      <div className={styles.field}>
        <span className={styles.label}>
          <MoonStar size={15} aria-hidden="true" /> Лёг вчера
        </span>
        <input
          type="time"
          value={bounds.prevSleep}
          onChange={(e) => bounds.setPrevSleep(e.target.value)}
          aria-label="Время отбоя вчера"
        />
      </div>

      <div className={`${styles.field} ${bounds.wakeError ? styles.invalid : ''}`}>
        <span className={styles.label}>
          <Sunrise size={15} aria-hidden="true" /> Подъём
        </span>
        <input
          type="time"
          value={bounds.wake}
          onChange={(e) => bounds.setWake(e.target.value)}
          aria-label="Время подъёма"
        />
      </div>

      {bounds.wakeError && (
        <p className={styles.error} role="alert">
          <AlertTriangle size={13} aria-hidden="true" /> {bounds.wakeError}
        </p>
      )}

      <div className={styles.field}>
        <span className={styles.label}>
          <Moon size={15} aria-hidden="true" /> Отбой сегодня
        </span>
        <input
          type="time"
          value={bounds.sleep}
          onChange={(e) => bounds.setSleep(e.target.value)}
          aria-label="Время отбоя сегодня"
        />
      </div>

      <div className={styles.sleep}>
        <span className={styles.label}>
          <BedDouble size={15} aria-hidden="true" /> Сон
        </span>
        <strong>{bounds.sleepMinutes > 0 ? formatMinutes(bounds.sleepMinutes) : '—'}</strong>
      </div>
    </section>
  );
}
