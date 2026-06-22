import type { WorkoutSet as TSet, Workout, WorkoutExercise } from '@/types';
import { formatMinutes } from '@/utils/time';
import { formatDuration, regionColor } from '@/utils/workout';

import styles from './WorkoutView.module.scss';

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

/** Read-only label for a single set, per the exercise's tracking type. */
function setLabel(s: TSet, tracking?: string): string {
  if (tracking === 'duration') return formatDuration(s.duration_seconds ?? 0);
  if (tracking === 'distance') {
    const km = s.distance_km ? `${s.distance_km} км` : '';
    const dur = s.duration_seconds ? formatDuration(s.duration_seconds) : '';
    return [km, dur].filter(Boolean).join(' · ') || '—';
  }
  const reps = s.reps ?? 0;
  return s.weight ? `${reps} × ${s.weight} кг` : `${reps} повт`;
}

function exerciseStat(we: WorkoutExercise): string {
  const t = we.exercise_detail?.tracking;
  if (t === 'duration') {
    const total = we.sets.reduce((n, s) => n + (s.duration_seconds ?? 0), 0);
    return `${we.sets.length} подх · ${formatDuration(total)}`;
  }
  if (t === 'distance') {
    const km = we.sets.reduce((n, s) => n + Number(s.distance_km ?? 0), 0);
    const total = we.sets.reduce((n, s) => n + (s.duration_seconds ?? 0), 0);
    return `${Math.round(km * 100) / 100} км · ${formatDuration(total)}`;
  }
  const reps = we.sets.reduce((n, s) => n + (s.reps ?? 0), 0);
  const vol = we.sets.reduce((n, s) => n + (s.volume ?? 0), 0);
  const base = `${we.sets.length} подх · ${reps} повт`;
  return vol > 0 ? `${base} · ${Math.round(vol)} кг` : base;
}

interface Props {
  workout: Workout;
  onEdit: () => void;
  onBack: () => void;
}

export function WorkoutView({ workout, onEdit, onBack }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.ghost} onClick={onBack}>
          ← К списку
        </button>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          ✏️ Изменить
        </button>
      </div>

      <section className={styles.metaCard}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>📅 Дата</span>
          <span className={styles.metaValue}>{formatDate(workout.date)}</span>
        </div>
        {workout.start_time && workout.end_time && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>🕐 Время</span>
            <span className={styles.metaValue}>
              {workout.start_time.slice(0, 5)}–{workout.end_time.slice(0, 5)}
            </span>
          </div>
        )}
        {workout.duration_minutes != null && (
          <div className={`${styles.metaRow} ${styles.metaTotal}`}>
            <span className={styles.metaLabel}>⏱️ Длительность</span>
            <strong>{formatMinutes(workout.duration_minutes)}</strong>
          </div>
        )}
        {workout.note && <p className={styles.note}>{workout.note}</p>}
      </section>

      {workout.exercises.length === 0 ? (
        <p className={styles.muted}>В этой тренировке нет упражнений.</p>
      ) : (
        workout.exercises.map((we) => {
          const tracking = we.exercise_detail?.tracking;
          return (
            <section
              key={we.id}
              className={styles.exCard}
              style={{ '--accent': regionColor(we.exercise_detail?.region) } as React.CSSProperties}
            >
              <div className={styles.exHead}>
                <div className={styles.exTitle}>
                  <span className={styles.exName}>{we.exercise_detail?.name}</span>
                  <span className={styles.exStat}>{exerciseStat(we)}</span>
                </div>
                <span className={styles.exMuscle}>{we.exercise_detail?.muscle_label}</span>
              </div>

              <ul className={styles.setList}>
                {we.sets.map((s, i) => (
                  <li key={s.id ?? i} className={styles.setItem}>
                    <span className={styles.setNum}>{i + 1}</span>
                    <span className={styles.setVal}>{setLabel(s, tracking)}</span>
                    {s.done && (
                      <span className={styles.setDone} aria-label="Выполнено">
                        ✓
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
