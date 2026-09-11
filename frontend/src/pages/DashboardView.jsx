import { useAuth } from '../context/AuthContext';
import StudentDashboard from './dashboards/StudentDashboard';
import MentorDashboard from './dashboards/MentorDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function DashboardView() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="dot" style={{ display: 'inline-block', marginRight: 8 }} />
        Synchronizing Command Dashboard…
      </div>
    );
  }

  // Strictly render according to authenticated role
  if (user?.role === 'cadet') {
    return <StudentDashboard />;
  }

  if (user?.role === 'mentor') {
    return <MentorDashboard />;
  }

  // Admin / Commanding Officer (or default HQ view)
  return <AdminDashboard />;
}
