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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { useCategories, useStats } from '@/api/hooks';
import { CategoryDonut, type DonutDatum } from '@/components/charts/CategoryDonut';
import { ChartToggle, type ChartKind } from '@/components/charts/ChartToggle';
import { EntryBars, type EntryBarDatum } from '@/components/charts/EntryBars';
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

// Readable axis ticks (default recharts grey is too faint, esp. in dark theme).
const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 };
const AXIS_STROKE = 'var(--border)';

/** Table breakdown of one day, shown below the "structure of days" chart. */
function DayBreakdown({
  day,
  colorByName,
}: {
  day: Record<string, string | number>;
  colorByName: Record<string, string>;
}) {
  const items = Object.entries(day)
    .filter(([k, v]) => k !== 'date' && Number(v) > 0)
    .map(([name, v]) => ({ name, value: Number(v), color: colorByName[name] ?? 'var(--neutral)' }))
    .sort((a, b) => b.value - a.value);
  if (items.length === 0) return null;
  const total = items.reduce((s, p) => s + p.value, 0);

  return (
    <div className={styles.tip}>
      <div className={styles.tipTitle}>{fullDate(String(day.date))}</div>
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

const GOAL_KEY = 'tt_goal_hours';
const CAT_CHART_KEY = 'tt_cat_chart';

export function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [goalHours, setGoalHours] = useState(() => Number(localStorage.getItem(GOAL_KEY)) || 0);
  const [focusCat, setFocusCat] = useState('');
  const [catChart, setCatChart] = useState<ChartKind>(
    () => (localStorage.getItem(CAT_CHART_KEY) as ChartKind) || 'donut',
  );
  // Selected point index per chart — drives the fixed info shown below it.
  const [trendSel, setTrendSel] = useState<number | null>(null);
  const [hoursSel, setHoursSel] = useState<number | null>(null);
  const [daySel, setDaySel] = useState<number | null>(null);

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

  const setCatChartPref = (kind: ChartKind) => {
    setCatChart(kind);
    localStorage.setItem(CAT_CHART_KEY, kind);
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
  const focusBarData: EntryBarDatum[] = focusData.map((d) => ({
    label: String(Number(d.date.slice(8))),
    fullLabel: format(parseISO(d.date), 'd MMMM yyyy', { locale: ru }),
    minutes: d.minutes,
    color: focusColor,
  }));

  const donutData: DonutDatum[] = useMemo(
    () =>
      (data?.by_category ?? []).map((c) => ({
        name: c.name,
        minutes: c.minutes,
        color: c.color,
      })),
    [data],
  );

  const categoryBarData: EntryBarDatum[] = useMemo(
    () =>
      (data?.by_category ?? []).map((c) => ({
        label: c.icon,
        fullLabel: `${c.icon} ${c.name}`,
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

  // Whole-band hover/click -> the active index, for the fixed info below a chart.
  const picker =
    (setter: (i: number | null) => void) =>
    (s: { activeTooltipIndex?: number | null } | null) => {
      if (s && s.activeTooltipIndex != null) setter(s.activeTooltipIndex);
    };

  return (
    <div className={styles.page}>
      <div className={styles.periodBar}>
        <div className={styles.segment} role="tablist" aria-label="Период">
          {(['week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`${styles.segBtn} ${period === p ? styles.segActive : ''}`}
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
      </div>

      <section className={styles.group} aria-label="Распределение времени">
        <h2 className={styles.groupTitle}>Распределение времени</h2>
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
            <span className={styles.kpiLabel}>🌅 Среднее время подъёма</span>
            <strong>{totals.avg_wake_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>🌙 Среднее время отбоя</span>
            <strong>{totals.avg_sleep_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>💤 Часов сна в среднем</span>
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
          <LineChart
            data={data.trend}
            onMouseMove={picker(setTrendSel)}
            onClick={picker(setTrendSel)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={dayTick}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
              minTickGap={8}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
            />
            <Line
              type="monotone"
              dataKey="index"
              stroke="var(--productive)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className={styles.info} aria-live="polite">
          {trendSel != null && data.trend[trendSel] ? (
            <>
              <span className={styles.infoName}>{fullDate(String(data.trend[trendSel].date))}</span>
              <span className={styles.infoValue}>
                {data.trend[trendSel].index}% · {formatMinutes(data.trend[trendSel].productive)}
              </span>
            </>
          ) : (
            <span className={styles.muted}>Наведи или нажми на день</span>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>⏰ Продуктивные часы дня</h2>
        <p className={styles.caption}>
          В среднем за день: сколько минут ты продуктивен в каждый час суток (0–23).
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={prodHoursAvg}
            onMouseMove={picker(setHoursSel)}
            onClick={picker(setHoursSel)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="hour"
              tickFormatter={(h: number) => `${h}`}
              interval={1}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
            />
            <YAxis
              domain={[0, 60]}
              tickFormatter={(m: number) => `${m}м`}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
              width={34}
            />
            <Bar
              dataKey="minutes"
              fill="var(--productive)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className={styles.info} aria-live="polite">
          {hoursSel != null && prodHoursAvg[hoursSel] ? (
            <>
              <span className={styles.infoName}>
                {prodHoursAvg[hoursSel].hour}:00–{prodHoursAvg[hoursSel].hour + 1}:00
              </span>
              <span className={styles.infoValue}>
                {prodHoursAvg[hoursSel].minutes} мин в среднем
              </span>
            </>
          ) : (
            <span className={styles.muted}>Наведи или нажми на час</span>
          )}
        </div>
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
            <EntryBars data={focusBarData} />
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
          <BarChart
            data={data.by_day}
            onMouseMove={picker(setDaySel)}
            onClick={picker(setDaySel)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={dayTick}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
              minTickGap={6}
            />
            <YAxis
              tickFormatter={(m: number) => `${Math.round(m / 60)}ч`}
              tick={AXIS_TICK}
              stroke={AXIS_STROKE}
            />
            <Legend />
            {categoryNames.map((name) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="day"
                fill={colorByName[name] ?? 'var(--neutral)'}
                maxBarSize={48}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {daySel != null && data.by_day[daySel] ? (
          <DayBreakdown day={data.by_day[daySel]} colorByName={colorByName} />
        ) : (
          <p className={styles.muted}>Наведи или нажми на день, чтобы увидеть разбивку</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.goalHead}>
          <h2 className={styles.h2}>По категориям</h2>
          <ChartToggle value={catChart} onChange={setCatChartPref} />
        </div>

        {data.by_category.length === 0 ? (
          <p className={styles.muted}>Пока нет данных за период.</p>
        ) : (
          <>
            {catChart === 'donut' ? (
              <CategoryDonut data={donutData} />
            ) : (
              <EntryBars data={categoryBarData} />
            )}

            {/* Labelled breakdown — also serves as the chart legend. */}
            <ol className={styles.top}>
              {data.by_category.map((c) => {
                const pct = totals.minutes ? Math.round((c.minutes / totals.minutes) * 100) : 0;
                return (
                  <li key={c.id} className={styles.topRow}>
                    <span className={styles.topName}>
                      <span className={styles.topDot} style={{ background: c.color }} />
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
            </ol>
          </>
        )}
      </section>
    </div>
  );
}
