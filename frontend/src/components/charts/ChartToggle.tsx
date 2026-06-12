import styles from './ChartToggle.module.scss';

export type ChartKind = 'donut' | 'bars';

interface Props {
  value: ChartKind;
  onChange: (kind: ChartKind) => void;
}

const OPTIONS: { value: ChartKind; label: string; icon: string }[] = [
  { value: 'donut', label: 'Круг', icon: '◔' },
  { value: 'bars', label: 'Столбцы', icon: '▥' },
];

export function ChartToggle({ value, onChange }: Props) {
  return (
    <div className={styles.toggle} role="group" aria-label="Тип диаграммы">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`${styles.btn} ${value === o.value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span aria-hidden="true">{o.icon}</span> {o.label}
        </button>
      ))}
    </div>
  );
}
