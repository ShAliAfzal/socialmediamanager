import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ClientsPage from './pages/ClientsPage';
import ClientWorkspacePage from './pages/ClientWorkspacePage';
import CampaignPage from './pages/CampaignPage';
import AgentPage from './pages/AgentPage';
import ClientSchedulePage from './pages/ClientSchedulePage';

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="shell muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Private>
            <DashboardPage />
          </Private>
        }
      />
      <Route
        path="/settings"
        element={
          <Private>
            <SettingsPage />
          </Private>
        }
      />
      <Route
        path="/agent"
        element={
          <Private>
            <AgentPage />
          </Private>
        }
      />
      <Route
        path="/clients"
        element={
          <Private>
            <ClientsPage />
          </Private>
        }
      />
      <Route
        path="/clients/:id/schedule"
        element={
          <Private>
            <ClientSchedulePage />
          </Private>
        }
      />
      <Route
        path="/workspace"
        element={
          <Private>
            <ClientWorkspacePage />
          </Private>
        }
      />
      <Route
        path="/campaigns/:id"
        element={
          <Private>
            <CampaignPage />
          </Private>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
