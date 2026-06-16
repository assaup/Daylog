import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { formatMinutes } from '@/utils/time';

import styles from './chart.module.scss';

export interface DonutDatum {
  name: string;
  minutes: number;
  color: string;
}

export function CategoryDonut({ data }: { data: DonutDatum[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className={styles.hint}>Нет данных для диаграммы.</p>;
  }

  const total = data.reduce((s, d) => s + d.minutes, 0);
  const sel = active != null ? data[active] : null;
  const pct = sel && total ? Math.round((sel.minutes / total) * 100) : 0;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActive(index)}
            onClick={(_, index) => setActive(index)}
          >
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={d.color}
                opacity={active == null || active === i ? 1 : 0.35}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className={styles.selected} aria-live="polite">
        {sel ? (
          <>
            <span className={styles.selDot} style={{ background: sel.color }} />
            <span className={styles.selName}>{sel.name}</span>
            <span className={styles.selValue}>
              {formatMinutes(sel.minutes)} · {pct}%
            </span>
          </>
        ) : (
          <span className={styles.hint}>Нажми на сектор, чтобы увидеть детали</span>
        )}
      </div>
    </div>
  );
}
