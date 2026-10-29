import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute, RequireAuth } from './auth/guards';
import { Layout } from './components/Layout';
import { Spinner } from './components/Spinner';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })),
);

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="links/:id/analytics"
          element={
            <Suspense
              fallback={
                <div
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600"
                  role="status"
                >
                  <Spinner className="h-5 w-5 text-indigo-600" />
                  Loading analytics…
                </div>
              }
            >
              <AnalyticsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
