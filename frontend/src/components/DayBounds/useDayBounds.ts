import { useEffect, useRef, useState } from 'react';

import { useDayLog, useSaveDayLog } from '@/api/hooks';
import { diffMinutes, toHHMM } from '@/utils/time';

const SAVE_DELAY = 700;

const prevDay = (date: string): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Day anchors with load + debounced autosave + validation:
 *  - prevSleep: yesterday's bedtime (saved on the previous day's log),
 *  - wake: this morning's wake,
 *  - sleep: tonight's bedtime,
 *  - sleepMinutes: last night's sleep = prevSleep -> wake.
 */
export function useDayBounds(date: string, firstStart?: string) {
  const prevDate = prevDay(date);
  const { data } = useDayLog(date);
  const { data: prevData } = useDayLog(prevDate);
  const saveLog = useSaveDayLog();

  const [wake, setWakeState] = useState('');
  const [sleep, setSleepState] = useState('');
  const [prevSleep, setPrevSleepState] = useState('');

  const loadedRef = useRef<string | null>(null);
  const loadedPrevRef = useRef<string | null>(null);
  const todayDirty = useRef(false);
  const prevDirty = useRef(false);

  useEffect(() => {
    todayDirty.current = false;
    prevDirty.current = false;
  }, [date]);

  // Load today's wake/bedtime once per day.
  useEffect(() => {
    if (!data || loadedRef.current === date) return;
    loadedRef.current = date;
    setWakeState(toHHMM(data.wake_time ?? ''));
    setSleepState(toHHMM(data.sleep_time ?? ''));
  }, [data, date]);

  // Load yesterday's bedtime once per day.
  useEffect(() => {
    if (!prevData || loadedPrevRef.current === date) return;
    loadedPrevRef.current = date;
    setPrevSleepState(toHHMM(prevData.sleep_time ?? ''));
  }, [prevData, date]);

  const wakeError =
    wake && firstStart && wake > firstStart
      ? `Подъём позже первого интервала (${firstStart})`
      : '';
  const hasTodayError = Boolean(wakeError);

  // Save today's wake + bedtime.
  useEffect(() => {
    if (!todayDirty.current || hasTodayError) return;
    const timer = setTimeout(() => {
      saveLog.mutate({ date, wake_time: wake || null, sleep_time: sleep || null });
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake, sleep, hasTodayError]);

  // Save yesterday's bedtime (only that field — keeps yesterday's wake intact).
  useEffect(() => {
    if (!prevDirty.current) return;
    const timer = setTimeout(() => {
      saveLog.mutate({ date: prevDate, sleep_time: prevSleep || null });
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevSleep]);

  const setWake = (v: string) => {
    todayDirty.current = true;
    setWakeState(v);
  };
  const setSleep = (v: string) => {
    todayDirty.current = true;
    setSleepState(v);
  };
  const setPrevSleep = (v: string) => {
    prevDirty.current = true;
    setPrevSleepState(v);
  };

  const sleepMinutes = prevSleep && wake ? diffMinutes(prevSleep, wake) : 0;

  return {
    wake,
    sleep,
    prevSleep,
    setWake,
    setSleep,
    setPrevSleep,
    wakeError,
    sleepMinutes,
  };
}
