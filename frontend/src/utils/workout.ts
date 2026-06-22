import type { Tracking } from '@/types';

/** Region accent colours — shared by the editor, list cards and read view. */
export const REGION_COLORS: Record<string, string> = {
  chest: '#ff8c42',
  back: '#4f8cff',
  arms: '#a78bfa',
  legs: '#3ddc97',
  core: '#f4c430',
  cardio: '#22d3ee',
};

export const regionColor = (region?: string) =>
  (region && REGION_COLORS[region]) || 'var(--border)';

/** Seconds -> "5:30" (mm:ss) or "1:05:30" (h:mm:ss). */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const trackingNeedsReps = (t: Tracking) =>
  t === 'weight_reps' || t === 'bodyweight';
