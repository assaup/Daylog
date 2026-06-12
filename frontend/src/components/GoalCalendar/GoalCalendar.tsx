import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
} from 'date-fns';

import { formatMinutes } from '@/utils/time';

import styles from './GoalCalendar.module.scss';

export interface DayKinds {
  date: string;
  productive: number;
  neutral: number;
  waste: number;
  total: number;
}

interface Props {
  period: 'week' | 'month';
  from: Date;
  to: Date;
  days: DayKinds[];
  goal: number; // minutes; 0 = no goal
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const KIND_COLOR: Record<string, string> = {
  productive: 'var(--productive)',
  neutral: 'var(--neutral)',
  waste: 'var(--waste)',
};

function dominantKind(d?: DayKinds): string | null {
  if (!d || d.total === 0) return null;
  const entries: [string, number][] = [
    ['productive', d.productive],
    ['neutral', d.neutral],
    ['waste', d.waste],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 0 ? entries[0][0] : null;
}

export function GoalCalendar({ period, from, to, days, goal }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  const gridStart = period === 'month' ? startOfWeek(from, { weekStartsOn: 1 }) : from;
  const gridEnd = period === 'month' ? endOfWeek(to, { weekStartsOn: 1 }) : to;
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className={styles.grid} role="grid" aria-label="Календарь дней">
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles.weekday}>
            {w}
          </div>
        ))}

        {cells.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const d = byDate.get(key);
          const kind = dominantKind(d);
          const outside = period === 'month' && !isSameMonth(day, from);
          const goalMet = goal > 0 && d ? d.productive >= goal : false;
          const color = kind ? KIND_COLOR[kind] : 'transparent';

          return (
            <div
              key={key}
              className={`${styles.cell} ${outside ? styles.outside : ''} ${
                goalMet ? styles.goalMet : ''
              }`}
              style={{
                background: kind
                  ? `color-mix(in srgb, ${color} 26%, transparent)`
                  : 'var(--surface-2)',
                borderColor:
                  kind && !goalMet
                    ? `color-mix(in srgb, ${color} 50%, transparent)`
                    : undefined,
              }}
              title={
                d
                  ? `${key}\nПолезное: ${formatMinutes(d.productive)}\nНейтральное: ${formatMinutes(
                      d.neutral,
                    )}\nВпустую: ${formatMinutes(d.waste)}${goalMet ? '\n🎯 Цель достигнута' : ''}`
                  : key
              }
            >
              <span className={styles.dayNum}>{format(day, 'd')}</span>
              {goalMet && (
                <span className={styles.goalBadge} aria-label="Цель достигнута">
                  🎯
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span>
          <i style={{ background: 'var(--productive)' }} /> Полезное
        </span>
        <span>
          <i style={{ background: 'var(--neutral)' }} /> Нейтральное
        </span>
        <span>
          <i style={{ background: 'var(--waste)' }} /> Впустую
        </span>
        {goal > 0 && (
          <span>
            <i className={styles.ringSwatch} /> 🎯 в рамке — цель достигнута
          </span>
        )}
      </div>
    </div>
  );
}
