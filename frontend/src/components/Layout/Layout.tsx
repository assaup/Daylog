import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

import styles from './Layout.module.scss';

const TABS = [
  { to: '/', label: 'День', icon: '📅' },
  { to: '/stats', label: 'Статистика', icon: '📊' },
  { to: '/categories', label: 'Категории', icon: '🏷️' },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>⏱️ DayLog</span>

        {/* Desktop navigation lives in the header. */}
        <nav className={styles.headerNav} aria-label="Навигация">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `${styles.headerLink} ${isActive ? styles.headerLinkActive : ''}`
              }
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.user}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.theme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className={styles.username}>{user?.username}</span>
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Выйти
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabbar} aria-label="Основная навигация">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            <span aria-hidden="true" className={styles.tabIcon}>
              {tab.icon}
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
