import { X } from 'lucide-react';
import type { CategoryPreset } from '@/types';

import styles from './PresetPickerModal.module.scss';

interface Props {
  presets: CategoryPreset[];
  onAdd: (preset: CategoryPreset) => void;
  onClose: () => void;
}

export function PresetPickerModal({ presets, onAdd, onClose }: Props) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Готовые категории">
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 className={styles.title}>Готовые категории</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        {presets.length === 0 ? (
          <p className={styles.muted}>Все готовые категории уже добавлены.</p>
        ) : (
          <div className={styles.grid}>
            {presets.map((p) => (
              <button key={p.name} type="button" className={styles.chip} onClick={() => onAdd(p)}>
                <span className={styles.chipIcon}>{p.icon}</span>
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.done} onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
