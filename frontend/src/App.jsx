import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { RoleRoute } from './components/PermissionGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
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
import NCCMockTestHub from './pages/NCCMockTestHub';
import NCCMockTestArena from './pages/NCCMockTestArena';
import NCCMockTestResults from './pages/NCCMockTestResults';
import NCCQuestionPipeline from './pages/NCCQuestionPipeline';
import NCCMockTestAnalyticsDashboard from './pages/NCCMockTestAnalyticsDashboard';

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
          <Route element={<ErrorBoundary><ProtectedRoute><AppShell /></ProtectedRoute></ErrorBoundary>}>
            {/* Dynamic Role-Routed Main Station */}
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/my-profile" element={<MyProfileView />} />
            <Route path="/knowledge" element={<KnowledgeView />} />
            
            {/* Redirect legacy mock-tests route to NCC Mock Tests */}
            <Route path="/mock-test" element={<Navigate to="/ncc-mock-tests" replace />} />
            <Route path="/mock-test/*" element={<Navigate to="/ncc-mock-tests" replace />} />
            <Route path="/mock-tests" element={<Navigate to="/ncc-mock-tests" replace />} />
            <Route path="/mock-tests/*" element={<Navigate to="/ncc-mock-tests" replace />} />
            
            {/* NCC Certificate & Training Mock Exam System */}
            <Route path="/ncc-mock-tests" element={<NCCMockTestHub />} />
            <Route path="/ncc-mock-tests/arena" element={<NCCMockTestArena />} />
            <Route path="/ncc-mock-tests/results" element={<NCCMockTestResults />} />
            <Route
              path="/ncc-mock-tests/analytics"
              element={
                <RoleRoute allowedRoles={['admin', 'mentor', 'co', 'co_admin']}>
                  <NCCMockTestAnalyticsDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/ncc-mock-tests/pipeline"
              element={
                <RoleRoute allowedRoles={['admin', 'mentor', 'co', 'co_admin']}>
                  <NCCQuestionPipeline />
                </RoleRoute>
              }
            />

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

            {/* Role-based Direct Routes */}
            <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><DashboardView /></RoleRoute>} />
            <Route path="/mentor" element={<RoleRoute allowedRoles={['mentor']}><PerformanceView /></RoleRoute>} />
            <Route path="/cadet" element={<RoleRoute allowedRoles={['cadet']}><DashboardView /></RoleRoute>} />
          </Route>

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
