import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
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
import { Loader } from '@/components/Loader/Loader';
import { formatMinutes } from '@/utils/time';

import styles from './StatsPage.module.scss';

type Period = 'day' | 'week' | 'month' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  custom: 'Даты',
};

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// offset: 0 = current period, 1 = previous, 2 = two ago, ...
function computeRange(period: Period, offset: number): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'day') {
    const base = addDays(now, -offset);
    return { from: base, to: base };
  }
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
  if (period === 'day') return format(from, 'd MMMM yyyy', { locale: ru });
  if (period === 'month') return format(from, 'LLLL yyyy', { locale: ru });
  return `${format(from, 'd MMM', { locale: ru })} – ${format(to, 'd MMM yyyy', { locale: ru })}`;
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
  const todayIso = iso(new Date());
  const [period, setPeriod] = useState<Period>('day');
  const [offset, setOffset] = useState(0);
  const [dayDate, setDayDate] = useState(todayIso);
  const [customFrom, setCustomFrom] = useState(() => iso(addDays(new Date(), -6)));
  const [customTo, setCustomTo] = useState(() => iso(new Date()));
  const [goalHours, setGoalHours] = useState(() => Number(localStorage.getItem(GOAL_KEY)) || 0);
  const [focusCat, setFocusCat] = useState('');
  const [catChart, setCatChart] = useState<ChartKind>(
    () => (localStorage.getItem(CAT_CHART_KEY) as ChartKind) || 'donut',
  );
  // Selected point index per chart — drives the fixed info shown below it.
  const [trendSel, setTrendSel] = useState<number | null>(null);
  const [hoursSel, setHoursSel] = useState<number | null>(null);
  const [daySel, setDaySel] = useState<number | null>(null);

  const { from: fromDate, to: toDate } = useMemo(() => {
    if (period === 'custom') {
      const a = parseISO(customFrom);
      const b = parseISO(customTo);
      // Ignore half-typed / cleared dates instead of crashing.
      if (!isValid(a) || !isValid(b)) return computeRange('week', 0);
      return a <= b ? { from: a, to: b } : { from: b, to: a };
    }
    if (period === 'day') {
      const d = parseISO(dayDate);
      if (!isValid(d)) return computeRange('day', 0);
      return { from: d, to: d };
    }
    return computeRange(period, offset);
  }, [period, offset, dayDate, customFrom, customTo]);
  const from = iso(fromDate);
  const to = iso(toDate);
  const { data, isLoading } = useStats(from, to, Math.round(goalHours * 60));
  const { data: categories = [] } = useCategories();

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setOffset(0);
    if (p === 'day') setDayDate(todayIso);
  };

  const shiftDayDate = (delta: number) => {
    setDayDate((cur) => {
      const next = iso(addDays(parseISO(cur), delta));
      return next > todayIso ? cur : next;
    });
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
    return <Loader text="Загрузка статистики…" />;
  }

  const { totals } = data;
  const isDay = period === 'day';
  // The streak is "current, up to today" — only meaningful for the current period.
  const showStreak =
    period === 'day' ? dayDate === todayIso : period !== 'custom' && offset === 0;
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
          {(['day', 'week', 'month', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`${styles.segBtn} ${period === p ? styles.segActive : ''}`}
              onClick={() => changePeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className={styles.customRange}>
            <label>
              <span>с</span>
              <input
                type="date"
                value={customFrom}
                max={todayIso}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              <span>по</span>
              <input
                type="date"
                value={customTo}
                max={todayIso}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}

        {period === 'day' && (
          <div className={styles.nav}>
            <button type="button" onClick={() => shiftDayDate(-1)} aria-label="Предыдущий день">
              ←
            </button>
            <input
              className={styles.dayInput}
              type="date"
              value={dayDate}
              max={todayIso}
              onChange={(e) => e.target.value && setDayDate(e.target.value)}
              aria-label="Выбор дня"
            />
            <button
              type="button"
              onClick={() => shiftDayDate(1)}
              disabled={dayDate >= todayIso}
              aria-label="Следующий день"
            >
              →
            </button>
          </div>
        )}

        {(period === 'week' || period === 'month') && (
          <div className={styles.nav}>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Предыдущий период">
              ←
            </button>
            <span className={styles.navLabel}>{rangeLabel(period, fromDate, toDate)}</span>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              aria-label="Следующий период"
            >
              →
            </button>
          </div>
        )}
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
          {!isDay && (
            <>
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
            </>
          )}
        </div>
      </section>

      <section className={styles.group} aria-label="Режим сна">
        <h2 className={styles.groupTitle}>Режим и сон</h2>
        <div className={styles.kpis}>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>🌅 {isDay ? 'Время подъёма' : 'Среднее время подъёма'}</span>
            <strong>{totals.avg_wake_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>🌙 {isDay ? 'Время отбоя' : 'Среднее время отбоя'}</span>
            <strong>{totals.avg_sleep_time ?? '—'}</strong>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>💤 {isDay ? 'Часов сна' : 'Часов сна в среднем'}</span>
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
              <span className={styles.kpiLabel}>{isDay ? 'Цель за день' : 'Цель достигнута'}</span>
              <strong>
                {isDay
                  ? totals.goal_days > 0
                    ? 'Выполнена ✓'
                    : 'Не выполнена'
                  : `${totals.goal_days} из ${data.trend.length} дн.`}
              </strong>
            </div>
            {showStreak && (
              <div className={styles.kpi}>
                <span className={styles.kpiLabel}>🔥 Текущий стрик</span>
                <strong>{totals.current_streak} дн.</strong>
              </div>
            )}
          </div>
        )}

        {(period === 'week' || period === 'month') && (
          <GoalCalendar
            period={period}
            from={fromDate}
            to={toDate}
            days={data.trend}
            goal={Math.round(goalHours * 60)}
          />
        )}
      </section>

      {!isDay && (
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
      )}

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

      {!isDay && (
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
      )}

      {!isDay && (
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
      )}

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
