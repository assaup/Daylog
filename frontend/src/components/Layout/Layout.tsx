import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

import styles from './Layout.module.scss';

const TABS = [
  { to: '/', label: 'День', icon: '📅' },
  { to: '/stats', label: 'Статистика', icon: '📊' },
  { to: '/categories', label: 'Категории', icon: '🏷️' },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>⏱️ Трекер времени</span>
        <div className={styles.user}>
          <span>{user?.username}</span>
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
