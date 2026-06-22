import { useMemo, useRef, useState } from 'react';

import { useCreateWorkout, useUpdateWorkout } from '@/api/hooks';
import type { Exercise, Workout, WorkoutInput } from '@/types';
import { diffMinutes, formatMinutes } from '@/utils/time';
import { formatDuration, regionColor, trackingNeedsReps } from '@/utils/workout';

import { ExercisePickerModal } from './ExercisePickerModal';
import styles from './WorkoutEditor.module.scss';

let uidSeq = 0;
const nextUid = () => `w${(uidSeq += 1)}`;

interface SetRow {
  _uid: string;
  reps: string;
  weight: string;
  durMin: string;
  durSec: string;
  distance: string;
  done: boolean;
}

interface ExRow {
  _uid: string;
  exercise: number;
  detail: Exercise;
  withWeight: boolean; // bodyweight exercises: reveal the optional weight column
  sets: SetRow[];
}

const emptySet = (weight = ''): SetRow => ({
  _uid: nextUid(),
  reps: '',
  weight,
  durMin: '',
  durSec: '',
  distance: '',
  done: false,
});

const todayStr = () => new Date().toISOString().slice(0, 10);

const secToMin = (s: number | null) => (s ? String(Math.floor(s / 60)) : '');
const secToSec = (s: number | null) => (s ? String(s % 60) : '');
const toSeconds = (min: string, sec: string) =>
  (Number(min) || 0) * 60 + (Number(sec) || 0);

function fromWorkout(w: Workout): ExRow[] {
  return w.exercises.map((we) => {
    const detail = we.exercise_detail as Exercise;
    return {
      _uid: nextUid(),
      exercise: we.exercise,
      detail,
      withWeight:
        detail.tracking === 'bodyweight' && we.sets.some((s) => s.weight != null),
      sets: we.sets.map((s) => ({
        _uid: nextUid(),
        reps: s.reps != null ? String(s.reps) : '',
        weight: s.weight != null ? String(s.weight) : '',
        durMin: secToMin(s.duration_seconds),
        durSec: secToSec(s.duration_seconds),
        distance: s.distance_km != null ? String(s.distance_km) : '',
        done: s.done,
      })),
    };
  });
}

/** Does this row show a weight input? Always for weight_reps, opt-in for bodyweight. */
const showsWeight = (ex: ExRow) =>
  ex.detail.tracking === 'weight_reps' ||
  (ex.detail.tracking === 'bodyweight' && ex.withWeight);

interface Props {
  initial: Workout | null;
  onDone: () => void;
}

export function WorkoutEditor({ initial, onDone }: Props) {
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [start, setStart] = useState(initial?.start_time?.slice(0, 5) ?? '');
  const [end, setEnd] = useState(initial?.end_time?.slice(0, 5) ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [rows, setRows] = useState<ExRow[]>(() => (initial ? fromWorkout(initial) : []));
  const [pickerOpen, setPickerOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  const createWorkout = useCreateWorkout();
  const updateWorkout = useUpdateWorkout();
  const isSaving = createWorkout.isPending || updateWorkout.isPending;

  const addExercise = (exercise: Exercise) => {
    setRows((prev) => [
      ...prev,
      {
        _uid: nextUid(),
        exercise: exercise.id,
        detail: exercise,
        withWeight: false,
        sets: [emptySet()],
      },
    ]);
    setPickerOpen(false);
  };

  const removeExercise = (uid: string) =>
    setRows((prev) => prev.filter((r) => r._uid !== uid));

  const toggleWeight = (uid: string) =>
    setRows((prev) =>
      prev.map((r) => (r._uid === uid ? { ...r, withWeight: !r.withWeight } : r)),
    );

  const addSet = (exUid: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r._uid === exUid
          ? { ...r, sets: [...r.sets, emptySet(r.sets[r.sets.length - 1]?.weight ?? '')] }
          : r,
      ),
    );

  const removeSet = (exUid: string, setUid: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r._uid === exUid ? { ...r, sets: r.sets.filter((s) => s._uid !== setUid) } : r,
      ),
    );

  const patchSet = (exUid: string, setUid: string, patch: Partial<SetRow>) =>
    setRows((prev) =>
      prev.map((r) =>
        r._uid === exUid
          ? { ...r, sets: r.sets.map((s) => (s._uid === setUid ? { ...s, ...patch } : s)) }
          : r,
      ),
    );

  const jumpToAdd = () =>
    addRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const save = () => {
    const payload: WorkoutInput = {
      date,
      start_time: start || null,
      end_time: end || null,
      note: note.trim(),
      exercises: rows.map((r, exIndex) => {
        const t = r.detail.tracking;
        const weightOn = showsWeight(r);
        return {
          exercise: r.exercise,
          order: exIndex,
          sets: r.sets
            .filter((s) => {
              if (trackingNeedsReps(t)) return Number(s.reps) > 0;
              if (t === 'duration') return toSeconds(s.durMin, s.durSec) > 0;
              return Number(s.distance) > 0 || toSeconds(s.durMin, s.durSec) > 0;
            })
            .map((s, sIndex) => ({
              order: sIndex,
              reps: trackingNeedsReps(t) ? Number(s.reps) : null,
              weight: weightOn && s.weight ? s.weight : null,
              duration_seconds:
                t === 'duration' || t === 'distance'
                  ? toSeconds(s.durMin, s.durSec) || null
                  : null,
              distance_km: t === 'distance' && s.distance ? s.distance : null,
              done: s.done,
            })),
        };
      }),
    };

    const onSuccess = () => onDone();
    if (initial) updateWorkout.mutate({ id: initial.id, ...payload }, { onSuccess });
    else createWorkout.mutate(payload, { onSuccess });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.topBar}>
        <button type="button" className={styles.ghost} onClick={onDone}>
          ← К списку
        </button>
        <span className={styles.topTitle}>
          {initial ? 'Тренировка' : 'Новая тренировка'}
        </span>
      </div>

      <section className={styles.metaCard} aria-label="Дата и время тренировки">
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>📅 Дата</span>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Дата"
          />
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>🏁 Начало</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Время начала"
          />
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>🛑 Конец</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="Время конца"
          />
        </div>

        {start && end && (
          <div className={styles.metaTotal}>
            <span className={styles.metaLabel}>⏱️ Длительность</span>
            <strong>{formatMinutes(diffMinutes(start, end))}</strong>
          </div>
        )}

        <input
          className={styles.noteInput}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Описание"
          aria-label="Заметка"
        />
      </section>

      {rows.map((ex) => (
        <ExerciseCard
          key={ex._uid}
          ex={ex}
          onRemove={() => removeExercise(ex._uid)}
          onToggleWeight={() => toggleWeight(ex._uid)}
          onAddSet={() => addSet(ex._uid)}
          onRemoveSet={(setUid) => removeSet(ex._uid, setUid)}
          onPatchSet={(setUid, patch) => patchSet(ex._uid, setUid, patch)}
        />
      ))}

      <button
        ref={addRef}
        type="button"
        className={styles.addExercise}
        onClick={() => setPickerOpen(true)}
      >
        + Добавить упражнение
      </button>

      <button
        type="button"
        className={styles.save}
        onClick={save}
        disabled={isSaving || rows.length === 0}
      >
        {isSaving ? 'Сохранение…' : 'Сохранить тренировку'}
      </button>

      {rows.length > 0 && (
        <button
          type="button"
          className={styles.jumpBtn}
          onClick={jumpToAdd}
          aria-label="К добавлению упражнения"
        >
          + Упражнение
        </button>
      )}

      {pickerOpen && (
        <ExercisePickerModal onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

// --- Per-exercise card -----------------------------------------------------

interface CardProps {
  ex: ExRow;
  onRemove: () => void;
  onToggleWeight: () => void;
  onAddSet: () => void;
  onRemoveSet: (setUid: string) => void;
  onPatchSet: (setUid: string, patch: Partial<SetRow>) => void;
}

const COLUMNS: Record<string, string> = {
  reps_weight: '26px 1fr 1fr 34px 28px',
  reps_only: '26px 1fr 34px 28px',
  duration: '26px 1fr 34px 28px',
  distance: '26px 1fr 1.1fr 34px 28px',
};

function ExerciseCard({
  ex,
  onRemove,
  onToggleWeight,
  onAddSet,
  onRemoveSet,
  onPatchSet,
}: CardProps) {
  const t = ex.detail.tracking;
  const weighted = showsWeight(ex);
  const layout =
    t === 'duration'
      ? 'duration'
      : t === 'distance'
        ? 'distance'
        : weighted
          ? 'reps_weight'
          : 'reps_only';
  const cols = COLUMNS[layout];
  const accent = regionColor(ex.detail.region);

  const stat = useMemo(() => exerciseStat(ex), [ex]);

  return (
    <section
      className={styles.exCard}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className={styles.exHead}>
        <div className={styles.exTitle}>
          <span className={styles.exName}>{ex.detail?.name}</span>
          <span className={styles.exStat}>{stat}</span>
        </div>
        <span className={styles.exMuscle}>{ex.detail?.muscle_label}</span>
        <button
          type="button"
          className={styles.exRemove}
          onClick={onRemove}
          aria-label="Убрать упражнение"
        >
          ✕
        </button>
      </div>

      {t === 'bodyweight' && (
        <button type="button" className={styles.weightToggle} onClick={onToggleWeight}>
          {ex.withWeight ? '− Убрать вес' : '+ Добавить вес'}
        </button>
      )}

      <div className={styles.setHeader} style={{ gridTemplateColumns: cols }}>
        <span>#</span>
        {layout === 'duration' ? (
          <span>Время</span>
        ) : layout === 'distance' ? (
          <>
            <span>Км</span>
            <span>Время</span>
          </>
        ) : (
          <>
            <span>Повт.</span>
            {weighted && <span>Вес, кг</span>}
          </>
        )}
        <span aria-hidden="true">✓</span>
        <span />
      </div>

      {ex.sets.map((s, i) => (
        <div
          key={s._uid}
          className={`${styles.setRow} ${s.done ? styles.setDone : ''}`}
          style={{ gridTemplateColumns: cols }}
        >
          <span className={styles.setNum}>{i + 1}</span>

          {layout === 'duration' && (
            <TimeCell s={s} onPatch={(p) => onPatchSet(s._uid, p)} />
          )}

          {layout === 'distance' && (
            <>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={s.distance}
                onChange={(e) => onPatchSet(s._uid, { distance: e.target.value })}
                placeholder="0"
                aria-label={`Дистанция, подход ${i + 1}`}
              />
              <TimeCell s={s} onPatch={(p) => onPatchSet(s._uid, p)} />
            </>
          )}

          {(layout === 'reps_weight' || layout === 'reps_only') && (
            <>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={s.reps}
                onChange={(e) => onPatchSet(s._uid, { reps: e.target.value })}
                placeholder="0"
                aria-label={`Повторения, подход ${i + 1}`}
              />
              {weighted && (
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={s.weight}
                  onChange={(e) => onPatchSet(s._uid, { weight: e.target.value })}
                  placeholder="0"
                  aria-label={`Вес, подход ${i + 1}`}
                />
              )}
            </>
          )}

          <button
            type="button"
            className={`${styles.check} ${s.done ? styles.checkOn : ''}`}
            onClick={() => onPatchSet(s._uid, { done: !s.done })}
            aria-label={`Подход ${i + 1} выполнен`}
            aria-pressed={s.done}
          >
            {s.done ? '✓' : ''}
          </button>

          <button
            type="button"
            className={styles.setRemove}
            onClick={() => onRemoveSet(s._uid)}
            aria-label={`Удалить подход ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" className={styles.addSet} onClick={onAddSet}>
        + Новый подход
      </button>
    </section>
  );
}

function TimeCell({
  s,
  onPatch,
}: {
  s: SetRow;
  onPatch: (patch: Partial<SetRow>) => void;
}) {
  return (
    <span className={styles.timeCell}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={s.durMin}
        onChange={(e) => onPatch({ durMin: e.target.value })}
        placeholder="мин"
        aria-label="Минуты"
      />
      <span className={styles.colon}>:</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={s.durSec}
        onChange={(e) => onPatch({ durSec: e.target.value })}
        placeholder="сек"
        aria-label="Секунды"
      />
    </span>
  );
}

/** Short stat line under the exercise name, depends on tracking type. */
function exerciseStat(ex: ExRow): string {
  const t = ex.detail.tracking;
  if (t === 'duration') {
    const total = ex.sets.reduce((n, s) => n + toSeconds(s.durMin, s.durSec), 0);
    return `${ex.sets.length} подх · ${formatDuration(total)}`;
  }
  if (t === 'distance') {
    const km = ex.sets.reduce((n, s) => n + (Number(s.distance) || 0), 0);
    const total = ex.sets.reduce((n, s) => n + toSeconds(s.durMin, s.durSec), 0);
    return `${Math.round(km * 100) / 100} км · ${formatDuration(total)}`;
  }
  const reps = ex.sets.reduce((n, s) => n + (Number(s.reps) || 0), 0);
  const vol = showsWeight(ex)
    ? ex.sets.reduce((n, s) => n + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0)
    : 0;
  const base = `${ex.sets.length} подх · ${reps} повт`;
  return vol > 0 ? `${base} · ${Math.round(vol)} кг` : base;
}
