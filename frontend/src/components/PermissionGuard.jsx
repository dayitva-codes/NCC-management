import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../config/navigationConfig';
import AccessRestricted from './AccessRestricted';

/**
 * In-page element guard based on permission or roles
 * Example:
 * <PermissionGuard permission="cadets.manage">
 *   <button>Create Cadet</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ permission, allowedRoles, fallback = null, children }) {
  const { user } = useAuth();
  if (!user) return fallback;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return fallback;
  }

  if (permission && !hasPermission(user.role, permission)) {
    return fallback;
  }

  return children;
}

/**
 * Route-level role protection guard.
 * If unauthorized, renders the institutional 403 AccessRestricted screen
 * rather than allowing access or silently breaking.
 */
export function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="dot" style={{ display: 'inline-block', marginRight: 8 }} />
        Verifying military clearance credentials…
      </div>
    );
  }

  if (!user) {
    return <AccessRestricted requiredRoles={allowedRoles} attemptedPath={location.pathname} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessRestricted requiredRoles={allowedRoles} attemptedPath={location.pathname} />;
  }

  return children;
}

export default PermissionGuard;
