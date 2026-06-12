import { type FormEvent, useState } from 'react';

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/api/hooks';
import type { CategoryKind } from '@/types';

import styles from './CategoriesPage.module.scss';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'productive', label: 'Продуктивно' },
  { value: 'neutral', label: 'Нейтрально' },
  { value: 'waste', label: 'Впустую' },
];

const KIND_LABELS: Record<CategoryKind, string> = {
  productive: 'Продуктивно',
  neutral: 'Нейтрально',
  waste: 'Впустую',
};

export function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#4f8cff');
  const [icon, setIcon] = useState('⭐');
  const [kind, setKind] = useState<CategoryKind>('productive');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createCat.mutate(
      { name: name.trim(), color, icon, kind },
      {
        onSuccess: () => {
          setName('');
          setIcon('⭐');
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
            onChange={(e) => setName(e.target.value)}
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
      </form>

      <ul className={styles.list}>
        {categories.map((c) => (
          <li key={c.id} className={styles.item}>
            <span className={styles.dot} style={{ background: c.color }} aria-hidden="true" />
            <span className={styles.itemIcon} aria-hidden="true">
              {c.icon}
            </span>
            <span className={styles.itemName}>{c.name}</span>

            <select
              className={styles.itemKind}
              value={c.kind}
              disabled={c.is_default}
              onChange={(e) =>
                updateCat.mutate({ id: c.id, kind: e.target.value as CategoryKind })
              }
              aria-label={`Тип категории ${c.name}`}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {c.is_default ? (
              <span className={styles.badge} title="Категория по умолчанию">
                базовая
              </span>
            ) : (
              <button
                type="button"
                className={styles.del}
                onClick={() => deleteCat.mutate(c.id)}
                aria-label={`Удалить категорию ${c.name}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.hint}>
        Тип категории влияет на «индекс продуктивности» в статистике: {KIND_LABELS.productive} ↑,{' '}
        {KIND_LABELS.waste} ↓.
      </p>
    </div>
  );
}
