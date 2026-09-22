import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChartNoAxesColumn,
  Dumbbell,
  LogOut,
  Moon,
  Sun,
  Tags,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

import styles from './Layout.module.scss';

interface Tab {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: '/', label: 'День', hint: 'Интервалы, подъём и отбой', icon: CalendarDays },
  { to: '/workouts', label: 'Тренировки', hint: 'Журнал упражнений и объёма', icon: Dumbbell },
  {
    to: '/stats',
    label: 'Статистика',
    hint: 'Продуктивность, сон и цели',
    icon: ChartNoAxesColumn,
  },
  { to: '/categories', label: 'Категории', hint: 'На что уходит время', icon: Tags },
];

const todayLabel = () =>
  new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

/** Ignore hotkeys while the user is typing somewhere. */
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName));

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const current = TABS.find((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)));

  // Linear-style shortcuts: 1–4 switch sections, T toggles the theme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < TABS.length) navigate(TABS[idx].to);
      else if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'е') toggleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, toggleTheme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const themeLabel = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const initial = (user?.username ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className={styles.shell}>
      {/* Desktop sidebar. */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <Timer size={15} strokeWidth={2.4} />
          </span>
          DayLog
        </div>

        <nav className={styles.sideNav} aria-label="Навигация">
          <span className={styles.sideLabel}>Разделы</span>
          {TABS.map((tab, i) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `${styles.sideLink} ${isActive ? styles.sideLinkActive : ''}`
              }
            >
              <tab.icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
              <kbd className={styles.kbd}>{i + 1}</kbd>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sideFooter}>
          <button type="button" className={styles.sideLink} onClick={toggleTheme}>
            <ThemeIcon size={16} aria-hidden="true" />
            <span>{themeLabel}</span>
            <kbd className={styles.kbd}>T</kbd>
          </button>

          <div className={styles.profile}>
            <span className={styles.avatar} aria-hidden="true">
              {initial}
            </span>
            <span className={styles.profileName}>{user?.username}</span>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleLogout}
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.content}>
        {/* Mobile header / desktop page topbar. */}
        <header className={styles.header}>
          <span className={styles.mobileBrand}>
            <span className={styles.logo} aria-hidden="true">
              <Timer size={15} strokeWidth={2.4} />
            </span>
            DayLog
          </span>

          <div className={styles.pageTitle}>
            <h1>{current?.label}</h1>
            {current && <span className={styles.pageHint}>{current.hint}</span>}
          </div>

          <span className={styles.today}>{todayLabel()}</span>

          <div className={styles.mobileActions}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.iconBtn}
              aria-label={themeLabel}
              title={themeLabel}
            >
              <ThemeIcon size={16} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.iconBtn}
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.tabbar} aria-label="Основная навигация">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <tab.icon size={20} aria-hidden="true" />
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
