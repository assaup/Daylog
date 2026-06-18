import type { CSSProperties } from 'react';

import type { Category, EntryDraft } from '@/types';

import styles from './IntervalRow.module.scss';

interface Props {
  index: number;
  draft: EntryDraft;
  categories: Category[];
  error?: string;
  onChange: (index: number, patch: Partial<EntryDraft>) => void;
  onRemove: (index: number) => void;
}

export function IntervalRow({ index, draft, categories, error, onChange, onRemove }: Props) {
  const activeCat = categories.find((c) => c.id === draft.category);
  const accent = error ? 'var(--danger)' : (activeCat?.color ?? 'var(--border)');

  return (
    <div
      className={`${styles.row} ${error ? styles.rowError : ''}`}
      style={{ '--cat': accent } as CSSProperties}
    >
      <div className={styles.times}>
        <label className={styles.timeField}>
          <span className="visually-hidden">Начало интервала {index + 1}</span>
          <input
            type="time"
            value={draft.start_time}
            onChange={(e) => onChange(index, { start_time: e.target.value })}
            aria-label={`Начало интервала ${index + 1}`}
          />
        </label>
        <span className={styles.dash} aria-hidden="true">
          –
        </span>
        <label className={styles.timeField}>
          <span className="visually-hidden">Конец интервала {index + 1}</span>
          <input
            type="time"
            value={draft.end_time}
            onChange={(e) => onChange(index, { end_time: e.target.value })}
            aria-label={`Конец интервала ${index + 1}`}
          />
        </label>
      </div>

      <select
        className={styles.category}
        value={draft.category ?? ''}
        onChange={(e) =>
          onChange(index, { category: e.target.value ? Number(e.target.value) : null })
        }
        aria-label={`Категория интервала ${index + 1}`}
      >
        <option value="">— чем занимался —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>

      <input
        className={styles.note}
        type="text"
        placeholder="заметка (необязательно)"
        value={draft.note}
        onChange={(e) => onChange(index, { note: e.target.value })}
        aria-label={`Заметка интервала ${index + 1}`}
      />

      <button
        type="button"
        className={styles.remove}
        onClick={() => onRemove(index)}
        aria-label={`Удалить интервал ${index + 1}`}
      >
        ✕
      </button>

      {error && (
        <p className={styles.errorText} role="alert">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
