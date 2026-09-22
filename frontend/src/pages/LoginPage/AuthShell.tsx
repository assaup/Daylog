import type { ReactNode } from 'react';
import { ChartNoAxesColumn, Dumbbell, Target, Timer } from 'lucide-react';

import styles from './auth.module.scss';

const FEATURES = [
  { icon: Timer, text: 'Интервалы дня по категориям с автосохранением' },
  { icon: ChartNoAxesColumn, text: 'Индекс продуктивности, сон и тренды по периодам' },
  { icon: Target, text: 'Цели по полезному времени и серии дней' },
  { icon: Dumbbell, text: 'Журнал тренировок с объёмом и подходами' },
];

// Decorative sample day for the brand panel's preview ribbon.
const SAMPLE = [
  { from: 8, to: 8.5, color: '#8a8f98' },
  { from: 8.5, to: 12.5, color: '#7c73ff' },
  { from: 12.5, to: 13.25, color: '#f0b429' },
  { from: 13.25, to: 16, color: '#4cc38a' },
  { from: 16, to: 17, color: '#f2555a' },
  { from: 17, to: 19.5, color: '#7c73ff' },
  { from: 19.5, to: 21, color: '#3ea8f5' },
];

/** Auth layout: brand/pitch panel on desktop, bare form card on mobile. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <aside className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brand}>
          <span className={styles.logo}>
            <Timer size={16} strokeWidth={2.4} />
          </span>
          DayLog
        </div>

        <div className={styles.pitch}>
          <h2 className={styles.pitchTitle}>
            Узнай, на что на самом деле
            <br />
            уходит твой день
          </h2>
          <ul className={styles.features}>
            {FEATURES.map((f) => (
              <li key={f.text}>
                <f.icon size={16} />
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <span>Сегодня</span>
            <span className={styles.previewIndex}>78%</span>
          </div>
          <div className={styles.previewRibbon}>
            {SAMPLE.map((s) => (
              <span
                key={s.from}
                style={{
                  left: `${(s.from / 24) * 100}%`,
                  width: `${((s.to - s.from) / 24) * 100}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <div className={styles.previewStats}>
            <div>
              <small>Полезно</small>
              <strong>6ч 40м</strong>
            </div>
            <div>
              <small>Впустую</small>
              <strong>1ч 00м</strong>
            </div>
            <div>
              <small>Сон</small>
              <strong>7ч 10м</strong>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.formPanel}>{children}</main>
    </div>
  );
}
