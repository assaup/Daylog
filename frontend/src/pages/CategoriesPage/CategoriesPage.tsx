import { type FormEvent, useMemo, useState } from 'react';

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

const DEFAULT_ICON = '🏷️';

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
    if (!icon.trim()) {
      setError('Добавьте иконку (эмодзи)');
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
      <form className={styles.form} onSubmit={onSubmit}>
        <h2 className={styles.h2}>Новая категория</h2>
        <div className={styles.formRow}>
          <input
            className={styles.icon}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label="Иконка (эмодзи)"
            maxLength={2}
          />
          <input
            className={styles.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Название"
            aria-label="Название категории"
          />
          <input
            className={styles.color}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Цвет категории"
          />
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
            ⚠ {error}
          </p>
        )}
      </form>

      {availablePresets.length > 0 && (
        <button type="button" className={styles.presetsBtn} onClick={() => setShowPresets(true)}>
          ➕ Добавить из готовых
        </button>
      )}

      {grouped.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.kind} className={styles.group}>
              <h2 className={styles.groupTitle}>{KIND_LABELS[g.kind]}</h2>
              <ul className={styles.list}>
                {g.items.map((c) => (
                  <li key={c.id} className={styles.item}>
                    <span className={styles.dot} style={{ background: c.color }} aria-hidden="true" />
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
                      ✏️
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => deleteCat.mutate(c.id)}
                      aria-label={`Удалить категорию ${c.name}`}
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}

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
