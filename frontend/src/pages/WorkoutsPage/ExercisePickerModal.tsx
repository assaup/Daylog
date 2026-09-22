import { useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';

import { useExerciseTaxonomy, useExercises } from '@/api/hooks';
import type { Exercise } from '@/types';

import styles from './ExercisePickerModal.module.scss';

interface Props {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePickerModal({ onPick, onClose }: Props) {
  const { data: exercises = [] } = useExercises();
  const { data: taxonomy = [] } = useExerciseTaxonomy();

  const [region, setRegion] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const activeRegion = taxonomy.find((r) => r.region === region) ?? null;

  // Search overrides the drill-down: flat match across the whole library.
  const visible = useMemo<Exercise[]>(() => {
    if (query) {
      return exercises.filter((e) => e.name.toLowerCase().includes(query));
    }
    if (!region) return [];
    return exercises.filter((e) => e.region === region && (!muscle || e.primary_muscle === muscle));
  }, [exercises, query, region, muscle]);

  const pickRegion = (r: string) => {
    setRegion(r);
    setMuscle(null);
  };

  const back = () => {
    if (muscle) setMuscle(null);
    else setRegion(null);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Выбор упражнения">
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 className={styles.title}>Упражнение</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <input
          className={styles.search}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск упражнения"
          aria-label="Поиск упражнения"
        />

        {!query && (
          <>
            {/* Breadcrumb / back when drilled in. */}
            {region && (
              <div className={styles.crumbs}>
                <button type="button" className={styles.backBtn} onClick={back}>
                  <ChevronLeft size={15} aria-hidden="true" /> Назад
                </button>
                <span className={styles.crumbText}>
                  {activeRegion?.region_label}
                  {muscle &&
                    ` · ${activeRegion?.muscles.find((m) => m.muscle === muscle)?.muscle_label}`}
                </span>
              </div>
            )}

            {/* Step 1: zones */}
            {!region && (
              <div className={styles.chips}>
                {taxonomy.map((r) => (
                  <button
                    key={r.region}
                    type="button"
                    className={styles.chip}
                    style={{ '--accent': r.color } as React.CSSProperties}
                    onClick={() => pickRegion(r.region)}
                  >
                    {r.region_label}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: muscles within the chosen zone */}
            {activeRegion && (
              <div className={styles.chips}>
                {activeRegion.muscles.map((m) => (
                  <button
                    key={m.muscle}
                    type="button"
                    className={`${styles.chip} ${muscle === m.muscle ? styles.chipActive : ''}`}
                    style={{ '--accent': activeRegion.color } as React.CSSProperties}
                    onClick={() => setMuscle(muscle === m.muscle ? null : m.muscle)}
                  >
                    {m.muscle_label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Exercise list (filtered by drill-down or search) */}
        {(query || region) && (
          <ul className={styles.list}>
            {visible.length === 0 ? (
              <li className={styles.empty}>Ничего не найдено</li>
            ) : (
              visible.map((e) => (
                <li key={e.id}>
                  <button type="button" className={styles.item} onClick={() => onPick(e)}>
                    <span className={styles.itemName}>{e.name}</span>
                    <span className={styles.itemMuscle}>{e.muscle_label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {!query && !region && (
          <p className={styles.hint}>Выбери зону тела, затем мышцу и упражнение.</p>
        )}
      </div>
    </div>
  );
}
