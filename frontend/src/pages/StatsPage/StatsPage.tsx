import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useCategories, useStats } from '@/api/hooks';
import { CategoryDonut, type DonutDatum } from '@/components/charts/CategoryDonut';
import { GoalCalendar } from '@/components/GoalCalendar/GoalCalendar';
import { formatMinutes } from '@/utils/time';

import styles from './StatsPage.module.scss';

type Period = 'week' | 'month';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// offset: 0 = current period, 1 = previous, 2 = two ago, ...
function computeRange(period: Period, offset: number): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'week') {
    const base = addWeeks(now, -offset);
    return {
      from: startOfWeek(base, { weekStartsOn: 1 }),
      to: endOfWeek(base, { weekStartsOn: 1 }),
    };
  }
  const base = addMonths(now, -offset);
  return { from: startOfMonth(base), to: endOfMonth(base) };
}

function rangeLabel(period: Period, from: Date, to: Date): string {
  if (period === 'week') {
    return `${format(from, 'd MMM', { locale: ru })} – ${format(to, 'd MMM', { locale: ru })}`;
  }
  return format(from, 'LLLL yyyy', { locale: ru });
}

const fullDate = (d: string) => format(parseISO(d), 'd MMMM yyyy', { locale: ru });

interface TooltipItem {
  name: string;
  value: number;
  color?: string;
}

/** Table-style tooltip for the stacked "structure of days" chart. */
function DayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const items = payload.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  if (items.length === 0) return null;
  const total = items.reduce((s, p) => s + p.value, 0);

  return (
    <div className={styles.tip}>
      <div className={styles.tipTitle}>{fullDate(label)}</div>
      <table className={styles.tipTable}>
        <tbody>
          {items.map((p) => (
            <tr key={p.name}>
              <td>
                <span className={styles.tipDot} style={{ background: p.color }} />
                {p.name}
              </td>
              <td className={styles.tipValue}>{formatMinutes(p.value)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Всего</td>
            <td className={styles.tipValue}>{formatMinutes(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const KIND_LABELS: Record<string, string> = {
  productive: 'Продуктивно',
  neutral: 'Нейтрально',
  waste: 'Потрачено впустую',
};
const KIND_COLORS: Record<string, string> = {
  productive: 'var(--productive)',
  neutral: 'var(--neutral)',
  waste: 'var(--waste)',
};

const GOAL_KEY = 'tt_goal_hours';

export function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [goalHours, setGoalHours] = useState(() => Number(localStorage.getItem(GOAL_KEY)) || 0);
  const [focusCat, setFocusCat] = useState('');

  const { from: fromDate, to: toDate } = useMemo(
    () => computeRange(period, offset),
    [period, offset],
  );
  const from = iso(fromDate);
  const to = iso(toDate);
  const { data, isLoading } = useStats(from, to, Math.round(goalHours * 60));
  const { data: categories = [] } = useCategories();

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setOffset(0);
  };

  const setGoal = (hours: number) => {
    setGoalHours(hours);
    localStorage.setItem(GOAL_KEY, String(hours));
  };

  // Per-day minutes for the focused category (from by_day).
  const focusData = useMemo(() => {
    if (!focusCat || !data) return [];
    return data.by_day.map((d) => ({
      date: String(d.date),
      minutes: Number(d[focusCat] ?? 0),
    }));
  }, [focusCat, data]);

  const focusColor =
    categories.find((c) => c.name === focusCat)?.color ?? 'var(--primary)';
  const focusTotal = focusData.reduce((s, d) => s + d.minutes, 0);

  const donutData: DonutDatum[] = useMemo(
    () =>
      (data?.by_category ?? []).map((c) => ({
        name: c.name,
        minutes: c.minutes,
        color: c.color,
      })),
    [data],
  );

  // Distinct category names across the period -> stacked bar series.
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    for (const day of data?.by_day ?? []) {
      Object.keys(day).forEach((k) => k !== 'date' && names.add(k));
    }
    return [...names];
  }, [data]);

  const colorByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of data?.by_category ?? []) map[c.name] = c.color;
    return map;
  }, [data]);

  if (isLoading || !data) {
    return <p className={styles.muted}>Загрузка статистики…</p>;
  }

  const { totals } = data;
  const productiveShare = totals.minutes ? Math.round((totals.productive / totals.minutes) * 100) : 0;
  const wasteShare = totals.minutes ? Math.round((totals.waste / totals.minutes) * 100) : 0;
  const avgProductivePerDay = totals.filled_days
    ? Math.round(totals.productive / totals.filled_days)
    : 0;
  const avgWastePerDay = totals.filled_days ? Math.round(totals.waste / totals.filled_days) : 0;

  // Productive minutes per hour-of-day, averaged over the tracked days.
  const prodHoursAvg = data.prod_hours.map((h) => ({
    hour: h.hour,
    minutes: totals.filled_days ? Math.round(h.minutes / totals.filled_days) : 0,
  }));

  // Day number without month for chart X axes, e.g. "2026-05-03" -> "3".
  const dayTick = (d: string) => String(Number(d.slice(8)));

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="tablist" aria-label="Период">
        {(['week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            className={`${styles.tab} ${period === p ? styles.tabActive : ''}`}
            onClick={() => changePeriod(p)}
          >
            {p === 'week' ? 'Неделя' : 'Месяц'}
          </button>
        ))}
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          aria-label={period === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'}
        >
          ←
        </button>
        <span className={styles.navLabel}>{rangeLabel(period, fromDate, toDate)}</span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          aria-label={period === 'week' ? 'Следующая неделя' : 'Следующий месяц'}
        >
          →
        </button>
      </div>

      <section className={styles.group} aria-label="Полезное время">
        <h2 className={styles.groupTitle}>Полезное время</h2>
        <div className={styles.kpis}>
          <article className={`${styles.kpi} ${styles.kpiGood}`}>
            <span className={styles.kpiLabel}>✅ Полезное</span>
            <strong className={styles.kpiBig}>{formatMinutes(totals.productive)}</strong>
            <span className={styles.kpiHint}>{productiveShare}% от отмеченного</span>
          </article>
          <article className={`${styles.kpi} ${styles.kpiBad}`}>
            <span className={styles.kpiLabel}>🗑 Пожиратели</span>
            <strong className={styles.kpiBig}>{formatMinutes(totals.waste)}</strong>
            <span className={styles.kpiHint}>{wasteShare}% от отмеченного</span>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Полезное в день</span>
            <strong>{formatMinutes(avgProductivePerDay)}</strong>
            <span className={styles.kpiHint}>по {totals.filled_days} заполненным дн.</span>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Впустую в день</span>
            <strong>{formatMinutes(avgWastePerDay)}</strong>
            <span className={styles.kpiHint}>по {totals.filled_days} заполненным дн.</span>
          </article>
        </div>
      </section>

      <section className={styles.group} aria-label="Режим сна">
        <h2 className={styles.groupTitle}>Режим и сон</h2>
        <div className={styles.kpis}>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>🌅 Средний подъём</span>
            <strong>{totals.avg_wake_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>🌙 Средний отбой</span>
            <strong>{totals.avg_sleep_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>💤 Сна в среднем</span>
            <strong>
              {totals.avg_sleep_minutes != null ? formatMinutes(totals.avg_sleep_minutes) : '—'}
            </strong>
          </article>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.goalHead}>
          <h2 className={styles.h2}>🎯 Цель по полезному времени</h2>
          <label className={styles.goalInput}>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={goalHours || ''}
              onChange={(e) => setGoal(Number(e.target.value))}
              aria-label="Цель: часов полезного в день"
            />
            <span>ч/день</span>
          </label>
        </div>
        {goalHours > 0 && (
          <div className={styles.goalCards}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Цель достигнута</span>
              <strong>
                {totals.goal_days} из {data.trend.length} дн.
              </strong>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>🔥 Серия подряд</span>
              <strong>{totals.current_streak} дн.</strong>
            </div>
          </div>
        )}

        <GoalCalendar
          period={period}
          from={fromDate}
          to={toDate}
          days={data.trend}
          goal={Math.round(goalHours * 60)}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>📈 Тренд продуктивности · {rangeLabel(period, fromDate, toDate)}</h2>
        <p className={styles.caption}>
          По дням за период. % = доля полезного времени от всего отмеченного за день.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={dayTick} fontSize={11} minTickGap={8} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={11} />
            <Tooltip
              labelFormatter={(d: string) => fullDate(d)}
              formatter={(v: number) => [`${v}%`, 'Продуктивность']}
            />
            <Line
              type="monotone"
              dataKey="index"
              stroke="var(--productive)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>⏰ Продуктивные часы дня</h2>
        <p className={styles.caption}>
          В среднем за день: сколько минут ты продуктивен в каждый час суток (0–23).
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={prodHoursAvg}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="hour"
              tickFormatter={(h: number) => `${h}`}
              interval={1}
              fontSize={10}
            />
            <YAxis
              domain={[0, 60]}
              tickFormatter={(m: number) => `${m}м`}
              fontSize={11}
              width={32}
            />
            <Tooltip
              labelFormatter={(h: number) => `${h}:00–${h + 1}:00`}
              formatter={(v: number) => [`${v} мин в среднем`, 'Полезное']}
            />
            <Bar dataKey="minutes" fill="var(--productive)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className={styles.card}>
        <div className={styles.goalHead}>
          <h2 className={styles.h2}>🔍 Фокус по категории</h2>
          <select
            className={styles.focusSelect}
            value={focusCat}
            onChange={(e) => setFocusCat(e.target.value)}
            aria-label="Выбор категории для фокуса"
          >
            <option value="">— выбери категорию —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        {focusCat ? (
          <>
            <p className={styles.muted}>
              Всего «{focusCat}»: <strong>{formatMinutes(focusTotal)}</strong> за период
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={focusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={dayTick} fontSize={11} minTickGap={6} />
                <YAxis tickFormatter={(m: number) => `${Math.round(m / 60)}ч`} fontSize={11} />
                <Tooltip
                  labelFormatter={(d: string) => fullDate(String(d))}
                  formatter={(v: number) => [formatMinutes(v), 'Время']}
                />
                <Bar dataKey="minutes" name="Время" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {focusData.map((_, i) => (
                    <Cell key={i} fill={focusColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className={styles.muted}>
            Выбери категорию (учёба, спорт…), чтобы увидеть, сколько времени ты уделял ей по дням.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Структура дней · {rangeLabel(period, fromDate, toDate)}</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.by_day}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={dayTick} fontSize={11} minTickGap={6} />
            <YAxis tickFormatter={(m: number) => `${Math.round(m / 60)}ч`} fontSize={11} />
            <Tooltip content={<DayTooltip />} />
            <Legend />
            {categoryNames.map((name) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="day"
                fill={colorByName[name] ?? 'var(--neutral)'}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.card}>
          <h2 className={styles.h2}>По категориям</h2>
          <CategoryDonut data={donutData} />
        </section>

        <section className={styles.card}>
          <h2 className={styles.h2}>По типу времени</h2>
          <ul className={styles.kindList}>
            {data.by_kind.map((k) => (
              <li key={k.kind} className={styles.kindRow}>
                <span className={styles.kindDot} style={{ background: KIND_COLORS[k.kind] }} />
                <span>{KIND_LABELS[k.kind]}</span>
                <span className={styles.kindValue}>{formatMinutes(k.minutes)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.h2}>Топ категорий</h2>
        <ol className={styles.top}>
          {data.by_category.slice(0, 8).map((c) => {
            const pct = totals.minutes ? Math.round((c.minutes / totals.minutes) * 100) : 0;
            return (
              <li key={c.id} className={styles.topRow}>
                <span className={styles.topName}>
                  {c.icon} {c.name}
                </span>
                <div className={styles.topBar}>
                  <div
                    className={styles.topBarFill}
                    style={{ width: `${pct}%`, background: c.color }}
                  />
                </div>
                <span className={styles.topValue}>
                  {formatMinutes(c.minutes)} · {pct}%
                </span>
              </li>
            );
          })}
          {data.by_category.length === 0 && <p className={styles.muted}>Пока нет данных.</p>}
        </ol>
      </section>
    </div>
  );
}
