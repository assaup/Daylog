import { useEffect, useRef, useState } from 'react';

import { useDayLog, useSaveDayLog } from '@/api/hooks';
import { diffMinutes, formatMinutes, toHHMM } from '@/utils/time';

import styles from './DayBounds.module.scss';

const SAVE_DELAY = 700;

const prevDay = (date: string): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

interface Props {
  date: string;
  /** Start of the earliest filled interval ("HH:MM"), if any. */
  firstStart?: string;
  /** End of the latest filled interval ("HH:MM"), if any. */
  lastEnd?: string;
}

/** Wake-up and bedtime anchors for the day, autosaved on change. */
export function DayBounds({ date, firstStart, lastEnd }: Props) {
  const { data } = useDayLog(date);
  const { data: prevData } = useDayLog(prevDay(date));
  const saveLog = useSaveDayLog();

  const [wake, setWake] = useState('');
  const [sleep, setSleep] = useState('');

  const loadedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = false;
  }, [date]);

  // Load once per day.
  useEffect(() => {
    if (!data || loadedRef.current === date) return;
    loadedRef.current = date;
    setWake(toHHMM(data.wake_time ?? ''));
    setSleep(toHHMM(data.sleep_time ?? ''));
  }, [data, date]);

  // Validation: wake can't be after the first interval, bedtime can't be before
  // the last interval — the day's bounds must contain all recorded activity.
  const wakeError =
    wake && firstStart && wake > firstStart
      ? `Подъём позже первого интервала (${firstStart})`
      : '';
  const sleepError =
    sleep && lastEnd && sleep < lastEnd ? `Отбой раньше последнего интервала (${lastEnd})` : '';
  const hasError = Boolean(wakeError || sleepError);

  // Debounced save (skip while invalid).
  useEffect(() => {
    if (!dirtyRef.current || hasError) return;
    const timer = setTimeout(() => {
      saveLog.mutate({ date, wake_time: wake || null, sleep_time: sleep || null });
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake, sleep, hasError]);

  const onWake = (v: string) => {
    dirtyRef.current = true;
    setWake(v);
  };
  const onSleep = (v: string) => {
    dirtyRef.current = true;
    setSleep(v);
  };

  // A night's sleep = yesterday's bedtime -> this morning's wake. A bedtime
  // recorded after midnight is handled by diffMinutes' forward distance.
  const prevSleep = toHHMM(prevData?.sleep_time ?? '');
  const sleepMinutes = prevSleep && wake ? diffMinutes(prevSleep, wake) : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.bounds}>
        <label className={`${styles.field} ${wakeError ? styles.invalid : ''}`}>
          <span className={styles.label}>🌅 Подъём</span>
          <input type="time" value={wake} onChange={(e) => onWake(e.target.value)} />
        </label>

        {sleepMinutes > 0 && (
          <div className={styles.sleep}>
            <span className={styles.label}>💤 Сон </span>
            <strong>{formatMinutes(sleepMinutes)}</strong>
          </div>
        )}

        <label className={`${styles.field} ${sleepError ? styles.invalid : ''}`}>
          <span className={styles.label}>🌙 Отбой</span>
          <input type="time" value={sleep} onChange={(e) => onSleep(e.target.value)} />
        </label>
      </div>

      {hasError && (
        <p className={styles.error} role="alert">
          ⚠ {wakeError || sleepError}
        </p>
      )}
    </div>
  );
}
