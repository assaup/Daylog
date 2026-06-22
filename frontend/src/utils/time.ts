/** Normalize "HH:MM:SS" or "HH:MM" to "HH:MM". */
export function toHHMM(value: string): string {
  if (!value) return '';
  return value.slice(0, 5);
}

/** Minutes between two "HH:MM" times, supporting crossing midnight. */
export function diffMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
}

/** "95" -> "1 ч 35 мин". */
export function formatMinutes(total: number): string {
  if (!total) return '0 мин';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** "HH:MM" added with given minutes, clamped to 24h. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
