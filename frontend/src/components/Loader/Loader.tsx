import styles from './Loader.module.scss';

export function Loader({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.text}>{text}</span>
    </div>
  );
}
