import { formatMinutes } from '@/utils/time';

import styles from './DayFrame.module.scss';
import type { useDayBounds } from './useDayBounds';

type Bounds = ReturnType<typeof useDayBounds>;

/** Top-of-day frame: yesterday's bedtime, wake, sleep, then tonight's bedtime. */
export function DayFrame({ bounds }: { bounds: Bounds }) {
  return (
    <section className={styles.frame} aria-label="Подъём и отбой">
      <div className={styles.field}>
        <span className={styles.label}>🌙 Лёг вчера</span>
        <input
          type="time"
          value={bounds.prevSleep}
          onChange={(e) => bounds.setPrevSleep(e.target.value)}
          aria-label="Время отбоя вчера"
        />
      </div>

      <div className={`${styles.field} ${bounds.wakeError ? styles.invalid : ''}`}>
        <span className={styles.label}>🌅 Подъём</span>
        <input
          type="time"
          value={bounds.wake}
          onChange={(e) => bounds.setWake(e.target.value)}
          aria-label="Время подъёма"
        />
      </div>

      {bounds.sleepMinutes > 0 && (
        <div className={styles.sleep}>
          <span className={styles.label}>💤 Сон</span>
          <strong>{formatMinutes(bounds.sleepMinutes)}</strong>
        </div>
      )}

      {bounds.wakeError && (
        <p className={styles.error} role="alert">
          ⚠ {bounds.wakeError}
        </p>
      )}

      <div className={styles.divider} />

      <div className={`${styles.field} ${bounds.sleepError ? styles.invalid : ''}`}>
        <span className={styles.label}>🌙 Отбой сегодня</span>
        <input
          type="time"
          value={bounds.sleep}
          onChange={(e) => bounds.setSleep(e.target.value)}
          aria-label="Время отбоя сегодня"
        />
      </div>

      {bounds.sleepError && (
        <p className={styles.error} role="alert">
          ⚠ {bounds.sleepError}
        </p>
      )}
    </section>
  );
}
