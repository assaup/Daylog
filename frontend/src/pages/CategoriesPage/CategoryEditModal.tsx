import { useState } from 'react';

import { useEditCategory } from '@/api/hooks';
import type { Category, CategoryKind } from '@/types';

import styles from './CategoryEditModal.module.scss';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'productive', label: 'Полезное' },
  { value: 'neutral', label: 'Нейтральное' },
  { value: 'waste', label: 'Впустую' },
];

const emojiOnly = (s: string) =>
  Array.from(s)
    .filter((ch) => /\p{Extended_Pictographic}/u.test(ch))
    .slice(0, 2)
    .join('');

export function CategoryEditModal({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const editCat = useEditCategory();

  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState(category.color);
  const [kind, setKind] = useState<CategoryKind>(category.kind);
  const [askMode, setAskMode] = useState(false);

  const criticalChanged = name.trim() !== category.name || kind !== category.kind;

  const save = (mode: 'all' | 'new') => {
    editCat.mutate(
      { id: category.id, name: name.trim(), icon, color, kind, mode },
      { onSuccess: onClose },
    );
  };

  const onSubmit = () => {
    if (!name.trim()) return;
    // Cosmetic-only changes apply in place without asking.
    if (criticalChanged) setAskMode(true);
    else save('all');
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Редактирование категории">
      <div className={styles.modal}>
        {!askMode ? (
          <>
            <h2 className={styles.title}>Категория</h2>
            <div className={styles.row}>
              <input
                className={styles.icon}
                value={icon}
                onChange={(e) => setIcon(emojiOnly(e.target.value))}
                maxLength={4}
                aria-label="Иконка"
              />
              <input
                className={styles.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название"
                aria-label="Название"
              />
              <input
                className={styles.color}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Цвет"
              />
            </div>
            <select
              className={styles.kind}
              value={kind}
              onChange={(e) => setKind(e.target.value as CategoryKind)}
              aria-label="Тип"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={onSubmit}
                disabled={!name.trim() || editCat.isPending}
              >
                Сохранить
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.title}>Применить изменения</h2>
            <p className={styles.note}>
              Ты изменил название или тип категории. Это влияет на прошлую статистику.
              Как применить?
            </p>
            <div className={styles.choice}>
              <button
                type="button"
                className={styles.choiceBtn}
                onClick={() => save('all')}
                disabled={editCat.isPending}
              >
                <strong>Ко всем записям</strong>
                <span>Прошлые записи тоже станут новой категорией. История пересчитается.</span>
              </button>
              <button
                type="button"
                className={styles.choiceBtn}
                onClick={() => save('new')}
                disabled={editCat.isPending}
              >
                <strong>Только к новым</strong>
                <span>Старые записи останутся как были; новая версия — для будущих.</span>
              </button>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={() => setAskMode(false)}>
                Назад
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
