import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CategoriesPage } from '@/pages/CategoriesPage/CategoriesPage';
import { DayPage } from '@/pages/DayPage/DayPage';
import { LoginPage } from '@/pages/LoginPage/LoginPage';
import { RegisterPage } from '@/pages/LoginPage/RegisterPage';
import { StatsPage } from '@/pages/StatsPage/StatsPage';
import { useAuthStore } from '@/store/authStore';

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (!initialized) {
    return <div style={{ padding: 24 }}>Загрузка…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DayPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
