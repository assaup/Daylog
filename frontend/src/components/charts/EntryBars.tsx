import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { formatMinutes } from '@/utils/time';

import styles from './chart.module.scss';

type ChartClickState = { activeTooltipIndex?: number | null } | null;

export interface EntryBarDatum {
  /** Short X-axis label, e.g. the start time "14:00" or a category icon. */
  label: string;
  /** Full label for the info line, e.g. "Чтение · 14:00–15:00". */
  fullLabel: string;
  minutes: number;
  color: string;
}

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };

/** Vertical bar chart with a fixed info line below (hover on desktop, tap on mobile). */
export function EntryBars({ data }: { data: EntryBarDatum[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className={styles.hint}>Заполни интервалы, чтобы увидеть столбцы.</p>;
  }

  const chartData = data.map((d) => ({ ...d, hours: d.minutes / 60 }));
  const sel = active != null ? data[active] : null;

  // Click a column (anywhere along its height) to select; click again to clear.
  const pick = (s: ChartClickState) => {
    if (s && s.activeTooltipIndex != null) {
      const i = s.activeTooltipIndex;
      setActive((cur) => (cur === i ? null : i));
    }
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} onClick={pick}>
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={48}
            stroke="var(--border)"
          />
          <YAxis
            tick={AXIS_TICK}
            tickFormatter={(h: number) => `${h}ч`}
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax))]}
            stroke="var(--border)"
          />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} opacity={active == null || active === i ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className={styles.selected} aria-live="polite">
        {sel ? (
          <>
            <span className={styles.selDot} style={{ background: sel.color }} />
            <span className={styles.selName}>{sel.fullLabel}</span>
            <span className={styles.selValue}>{formatMinutes(sel.minutes)}</span>
          </>
        ) : (
          <span className={styles.hint}>Нажми на столбец, чтобы увидеть детали</span>
        )}
      </div>
    </div>
  );
}
