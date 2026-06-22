import styles from './ConfirmModal.module.scss';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Удалить',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{title}</h2>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onCancel}>
            Отмена
          </button>
          <button
            type="button"
            className={danger ? styles.danger : styles.primary}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
