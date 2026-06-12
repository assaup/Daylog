import type { EntryDraft } from '@/types';

export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Validate the day's intervals. Rule: one time slot — one task, intervals must
 * not overlap and end must be after start. Returns a map of row index -> error.
 */
export function validateIntervals(rows: EntryDraft[]): Map<number, string> {
  const errors = new Map<number, string>();
  const timed: { index: number; start: number; end: number }[] = [];

  rows.forEach((row, index) => {
    if (!row.start_time || !row.end_time) return;
    const start = timeToMinutes(row.start_time);
    const end = timeToMinutes(row.end_time);
    if (end <= start) {
      errors.set(index, 'Конец должен быть позже начала');
      return;
    }
    timed.push({ index, start, end });
  });

  // Detect overlaps by scanning sorted intervals.
  const sorted = [...timed].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.start < prev.end) {
      errors.set(curr.index, 'Пересекается с другим интервалом');
      if (!errors.has(prev.index)) {
        errors.set(prev.index, 'Пересекается с другим интервалом');
      }
    }
  }

  return errors;
}
