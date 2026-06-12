import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { formatMinutes } from '@/utils/time';

export interface DonutDatum {
  name: string;
  minutes: number;
  color: string;
}

export function CategoryDonut({ data }: { data: DonutDatum[] }) {
  if (data.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Нет данных для диаграммы.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="minutes"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatMinutes(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
