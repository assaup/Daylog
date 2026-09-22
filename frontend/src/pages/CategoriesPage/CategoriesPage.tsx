import { type FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Sparkles, Trash2 } from 'lucide-react';

import {
  useCategories,
  useCategoryPresets,
  useCreateCategory,
  useDeleteCategory,
} from '@/api/hooks';
import type { Category, CategoryKind } from '@/types';

import styles from './CategoriesPage.module.scss';
import { CategoryEditModal } from './CategoryEditModal';
import { PresetPickerModal } from './PresetPickerModal';

const DEFAULT_ICON = '';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'productive', label: 'Полезное' },
  { value: 'neutral', label: 'Нейтральное' },
  { value: 'waste', label: 'Впустую' },
];

const KIND_LABELS: Record<CategoryKind, string> = {
  productive: 'Полезное',
  neutral: 'Нейтральное',
  waste: 'Впустую',
};

const KIND_ORDER: CategoryKind[] = ['productive', 'neutral', 'waste'];

// Keep only emoji in the icon field (so plain text can't be entered).
const emojiOnly = (s: string) =>
  Array.from(s)
    .filter((ch) => /\p{Extended_Pictographic}/u.test(ch))
    .slice(0, 2)
    .join('');

export function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const { data: presets = [] } = useCategoryPresets();
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#4f8cff');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [kind, setKind] = useState<CategoryKind>('productive');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Presets not already in the user's active categories.
  const availablePresets = useMemo(() => {
    const have = new Set(categories.map((c) => c.name.toLowerCase()));
    return presets.filter((p) => !have.has(p.name.toLowerCase()));
  }, [presets, categories]);

  const grouped = useMemo(
    () => KIND_ORDER.map((k) => ({ kind: k, items: categories.filter((c) => c.kind === k) })),
    [categories],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название категории');
      return;
    }
    setError('');
    createCat.mutate(
      { name: name.trim(), color, icon, kind },
      {
        onSuccess: () => {
          setName('');
          setIcon(DEFAULT_ICON);
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.side}>
        <form className={styles.form} onSubmit={onSubmit}>
          <h2 className={styles.h2}>Новая категория</h2>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Иконка</span>
              <input
                className={styles.icon}
                value={icon}
                onChange={(e) => setIcon(emojiOnly(e.target.value))}
                aria-label="Иконка (эмодзи, необязательно)"
                maxLength={4}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldGrow}`}>
              <span className={styles.fieldLabel}>Название</span>
              <input
                className={styles.name}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Например, Спорт"
                aria-label="Название категории"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Цвет</span>
              <input
                className={styles.color}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Цвет категории"
              />
            </label>
          </div>
          <div className={styles.formRow}>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CategoryKind)}
              aria-label="Тип категории"
              className={styles.kind}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.add} disabled={createCat.isPending}>
              Добавить
            </button>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              <AlertTriangle size={13} aria-hidden="true" /> {error}
            </p>
          )}
        </form>

        {availablePresets.length > 0 && (
          <button type="button" className={styles.presetsBtn} onClick={() => setShowPresets(true)}>
            <Sparkles size={15} aria-hidden="true" /> Добавить из готовых
          </button>
        )}
      </div>

      <div className={styles.groups}>
        {grouped.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.kind} className={styles.group}>
                <h2 className={styles.groupTitle}>
                  <span
                    className={`${styles.kindDot} ${styles[`kind_${g.kind}`]}`}
                    aria-hidden="true"
                  />
                  {KIND_LABELS[g.kind]}
                  <span className={styles.groupCount}>{g.items.length}</span>
                </h2>
                <ul className={styles.list}>
                  {g.items.map((c) => (
                    <li key={c.id} className={styles.item}>
                      <span
                        className={styles.dot}
                        style={{ background: c.color }}
                        aria-hidden="true"
                      />
                      <span className={styles.itemIcon} aria-hidden="true">
                        {c.icon}
                      </span>
                      <span className={styles.itemName}>{c.name}</span>

                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => setEditing(c)}
                        aria-label={`Редактировать категорию ${c.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => deleteCat.mutate(c.id)}
                        aria-label={`Удалить категорию ${c.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
      </div>

      {editing && <CategoryEditModal category={editing} onClose={() => setEditing(null)} />}
      {showPresets && (
        <PresetPickerModal
          presets={availablePresets}
          onAdd={(p) => createCat.mutate(p)}
          onClose={() => setShowPresets(false)}
        />
      )}
    </div>
  );
}
