import { useState } from 'react';

import { useDeleteWorkout, useWorkouts } from '@/api/hooks';
import type { Workout } from '@/types';
import { formatMinutes } from '@/utils/time';
import { formatDuration, regionColor } from '@/utils/workout';

import { ConfirmModal } from './ConfirmModal';
import { WorkoutEditor } from './WorkoutEditor';
import { WorkoutView } from './WorkoutView';
import styles from './WorkoutsPage.module.scss';

type Screen =
  | { mode: 'list' }
  | { mode: 'view'; workout: Workout }
  | { mode: 'edit'; workout: Workout | null };

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });

/** Distinct trained regions (with colour) for the muscle-group chips. */
function regions(w: Workout): Array<{ region: string; label: string }> {
  const seen = new Map<string, string>();
  for (const we of w.exercises) {
    const d = we.exercise_detail;
    if (d && !seen.has(d.region)) seen.set(d.region, d.region_label);
  }
  return [...seen].map(([region, label]) => ({ region, label }));
}

export function WorkoutsPage() {
  const [screen, setScreen] = useState<Screen>({ mode: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const { data: workouts = [], isLoading } = useWorkouts();
  const deleteWorkout = useDeleteWorkout();

  if (screen.mode === 'edit') {
    return (
      <WorkoutEditor
        initial={screen.workout}
        onDone={() => setScreen({ mode: 'list' })}
      />
    );
  }

  if (screen.mode === 'view') {
    return (
      <WorkoutView
        workout={screen.workout}
        onEdit={() => setScreen({ mode: 'edit', workout: screen.workout })}
        onBack={() => setScreen({ mode: 'list' })}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🏋️ Тренировки</h1>
        <button
          type="button"
          className={styles.newBtn}
          onClick={() => setScreen({ mode: 'edit', workout: null })}
        >
          + Новая
        </button>
      </div>

      {isLoading ? (
        <p className={styles.muted}>Загрузка…</p>
      ) : workouts.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>💪</span>
          <p>Пока нет ни одной тренировки.</p>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setScreen({ mode: 'edit', workout: null })}
          >
            Записать первую
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {workouts.map((w) => {
            const regs = regions(w);
            const accent = regionColor(w.exercises[0]?.exercise_detail?.region);
            return (
              <li key={w.id}>
                <button
                  type="button"
                  className={styles.card}
                  style={{ '--accent': accent } as React.CSSProperties}
                  onClick={() => setScreen({ mode: 'view', workout: w })}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardDate}>{formatDate(w.date)}</span>
                    {w.duration_minutes != null && (
                      <span className={styles.cardDur}>
                        {formatMinutes(w.duration_minutes)}
                      </span>
                    )}
                  </div>

                  {regs.length > 0 && (
                    <div className={styles.muscles}>
                      {regs.map((r) => (
                        <span
                          key={r.region}
                          className={styles.muscleChip}
                          style={{ '--chip': regionColor(r.region) } as React.CSSProperties}
                        >
                          {r.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.cardStats}>
                    <span>{w.totals.exercises} упр.</span>
                    <span>{w.totals.sets} подх.</span>
                    {w.totals.volume > 0 && (
                      <span className={styles.accentStat}>{w.totals.volume} кг</span>
                    )}
                    {w.totals.distance_km > 0 && (
                      <span className={styles.accentStat}>{w.totals.distance_km} км</span>
                    )}
                    {w.totals.volume === 0 &&
                      w.totals.distance_km === 0 &&
                      w.totals.duration_seconds > 0 && (
                        <span className={styles.accentStat}>
                          {formatDuration(w.totals.duration_seconds)}
                        </span>
                      )}
                  </div>
                </button>

                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => setDeleteTarget(w)}
                  aria-label="Удалить тренировку"
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить тренировку?"
          message={`Тренировка за ${formatDate(deleteTarget.date)} будет удалена безвозвратно.`}
          confirmLabel="Удалить"
          onConfirm={() => {
            deleteWorkout.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
