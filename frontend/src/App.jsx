import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { RoleRoute } from './components/PermissionGuard';
import Login from './pages/Login';
import RegisterCadet from './pages/RegisterCadet';
import RegisterMentor from './pages/RegisterMentor';
import DashboardView from './pages/DashboardView';
import CadetsView from './pages/CadetsView';
import BattalionsView from './pages/BattalionsView';
import DivisionsView from './pages/DivisionsView';
import MentorsView from './pages/MentorsView';
import PerformanceView from './pages/PerformanceView';
import AttendanceView from './pages/AttendanceView';
import Leaderboard from './pages/Leaderboard';
import TasksView from './pages/TasksView';
import AISuiteView from './pages/AISuiteView';
import KnowledgeView from './pages/KnowledgeView';
import MyProfileView from './pages/MyProfileView';
import ReportsView from './pages/ReportsView';
import SettingsView from './pages/SettingsView';
import AdminHome from './pages/AdminHome';
import MentorHome from './pages/MentorHome';
import CadetHome from './pages/CadetHome';

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 48, color: 'var(--text-muted)', textAlign: 'center' }}>Synchronizing Military Security Station…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register/cadet" element={<RegisterCadet />} />
          <Route path="/register/mentor" element={<RegisterMentor />} />

          {/* Authenticated Application Shell */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            {/* Dynamic Role-Routed Main Station */}
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/my-profile" element={<MyProfileView />} />
            <Route path="/knowledge" element={<KnowledgeView />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/tasks" element={<TasksView />} />
            <Route path="/performance" element={<PerformanceView />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/ai-suite" element={<AISuiteView />} />
            <Route path="/settings" element={<SettingsView />} />

            {/* Cadets Roster: Accessible to Admins and Mentors */}
            <Route
              path="/cadets"
              element={
                <RoleRoute allowedRoles={['admin', 'mentor']}>
                  <CadetsView />
                </RoleRoute>
              }
            />

            {/* Organization HQ Controls: Admin Only */}
            <Route
              path="/battalions"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <BattalionsView />
                </RoleRoute>
              }
            />
            <Route
              path="/divisions"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <DivisionsView />
                </RoleRoute>
              }
            />
            <Route
              path="/mentors"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <MentorsView />
                </RoleRoute>
              }
            />

            {/* Inspection Reports: Admin & Mentor */}
            <Route
              path="/reports"
              element={
                <RoleRoute allowedRoles={['admin', 'mentor']}>
                  <ReportsView />
                </RoleRoute>
              }
            />

            {/* Backwards-compatible Role Routes */}
            <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminHome /></RoleRoute>} />
            <Route path="/mentor" element={<RoleRoute allowedRoles={['mentor']}><MentorHome /></RoleRoute>} />
            <Route path="/cadet" element={<RoleRoute allowedRoles={['cadet']}><CadetHome /></RoleRoute>} />
          </Route>

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
