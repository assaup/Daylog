import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMinutes } from '@/utils/time';

export interface EntryBarDatum {
  /** Short X-axis label, e.g. the start time "14:00". */
  label: string;
  /** Full label for the tooltip, e.g. "Чтение · 14:00–15:00". */
  fullLabel: string;
  minutes: number;
  color: string;
}

/** One column per filled interval: X = intervals, Y = hours, height = duration. */
export function EntryBars({ data }: { data: EntryBarDatum[] }) {
  if (data.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Заполни интервалы, чтобы увидеть столбцы.</p>;
  }

  const chartData = data.map((d) => ({ ...d, hours: d.minutes / 60 }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="label" fontSize={11} interval={0} angle={-35} textAnchor="end" height={48} />
        <YAxis
          fontSize={11}
          tickFormatter={(h: number) => `${h}ч`}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(_v: number, _n, item) => [
            formatMinutes((item.payload as EntryBarDatum).minutes),
            (item.payload as EntryBarDatum).fullLabel,
          ]}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
