/**
 * Centralized Role-Based Navigation Configuration
 * 
 * Defines accessible sections and routes per role (cadet, mentor, admin).
 * Enforces the core rule: Role + Permission + Scope = Visible UI
 */

export const ROLE_PERMISSIONS = {
  cadet: [
    'dashboard.view',
    'profile.view',
    'attendance.view_self',
    'performance.view_self',
    'tasks.view_self',
    'knowledge.view',
    'mock_tests.view',
    'ai_insights.view_self',
    'leaderboard.view',
    'settings.view',
  ],
  mentor: [
    'dashboard.view',
    'profile.view',
    'cadets.view_assigned',
    'cadets.evaluate',
    'performance.evaluate',
    'attendance.record',
    'leaderboard.view',
    'tasks.manage_assigned',
    'ai_suite.view_mentor',
    'knowledge.view',
    'mock_tests.view',
    'reports.view',
    'settings.view',
  ],
  admin: [
    'dashboard.view',
    'profile.view',
    'cadets.manage',
    'mentors.manage',
    'battalions.manage',
    'divisions.manage',
    'performance.manage',
    'attendance.manage',
    'leaderboard.view',
    'tasks.manage',
    'ai_suite.manage',
    'knowledge.view',
    'mock_tests.view',
    'reports.manage',
    'settings.manage',
  ],
};

export const NAVIGATION_CONFIG = {
  cadet: [
    {
      group: 'Personal Command',
      badge: 'SELF',
      items: [
        { label: 'My Dashboard', path: '/dashboard', icon: '📊', permission: 'dashboard.view' },
        { label: 'My Cadet Profile', path: '/my-profile', icon: '👤', permission: 'profile.view' },
      ],
    },
    {
      group: 'NCC Records',
      badge: 'NCC',
      items: [
        { label: 'My Attendance', path: '/attendance', icon: '📋', permission: 'attendance.view_self' },
        { label: 'My Performance', path: '/performance', icon: '🎯', permission: 'performance.view_self' },
        { label: 'My Tasks & Drills', path: '/tasks', icon: '📅', permission: 'tasks.view_self' },
      ],
    },
    {
      group: 'Learning & AI',
      badge: 'AI/KNOW',
      items: [
        { label: 'NCC Mock Test Arena', path: '/ncc-mock-tests', icon: '🎯', permission: 'mock_tests.view' },
        { label: 'Books & Syllabus Library', path: '/knowledge', icon: '📚', permission: 'knowledge.view' },
        { label: 'AI Insights & Planner', path: '/ai-suite', icon: '🤖', permission: 'ai_insights.view_self' },
      ],
    },
    {
      group: 'Unit Standing',
      badge: 'RANK',
      items: [
        { label: 'Battalion Leaderboard', path: '/leaderboard', icon: '🏆', permission: 'leaderboard.view' },
      ],
    },
    {
      group: 'System',
      badge: 'SYS',
      items: [
        { label: 'Settings', path: '/settings', icon: '⚙️', permission: 'settings.view' },
      ],
    },
  ],

  mentor: [
    {
      group: 'Unit Operations',
      badge: 'ANO',
      items: [
        { label: 'Commander Dashboard', path: '/dashboard', icon: '📊', permission: 'dashboard.view' },
        { label: 'Officer Profile', path: '/my-profile', icon: '🎖️', permission: 'profile.view' },
      ],
    },
    {
      group: 'Cadet Management',
      badge: 'CADETS',
      items: [
        { label: 'My Assigned Cadets', path: '/cadets', icon: '👥', permission: 'cadets.view_assigned' },
        { label: '9-Pillar Evaluation', path: '/performance', icon: '🎯', permission: 'performance.evaluate' },
        { label: 'Parade Attendance', path: '/attendance', icon: '📋', permission: 'attendance.record' },
      ],
    },
    {
      group: 'Operations & Drills',
      badge: 'OPS',
      items: [
        { label: 'Battalion Leaderboard', path: '/leaderboard', icon: '🏆', permission: 'leaderboard.view' },
        { label: 'Task Assignment', path: '/tasks', icon: '📅', permission: 'tasks.manage_assigned' },
      ],
    },
    {
      group: 'AI & Knowledge',
      badge: 'AI LAB',
      items: [
        { label: 'NCC Mock Test Arena', path: '/ncc-mock-tests', icon: '🎯', permission: 'mock_tests.view' },
        { label: 'Student Exam Analytics', path: '/ncc-mock-tests/analytics', icon: '📈', permission: 'mock_tests.view' },
        { label: 'Question Bank Pipeline', path: '/ncc-mock-tests/pipeline', icon: '📊', permission: 'mock_tests.view' },
        { label: 'AI Performance Insights', path: '/ai-suite', icon: '🤖', permission: 'ai_suite.view_mentor' },
        { label: 'Books & Syllabus Library', path: '/knowledge', icon: '📚', permission: 'knowledge.view' },
      ],
    },
    {
      group: 'Inspection & Setup',
      badge: 'SYS',
      items: [
        { label: 'Unit Reports', path: '/reports', icon: '📑', permission: 'reports.view' },
        { label: 'Settings', path: '/settings', icon: '⚙️', permission: 'settings.view' },
      ],
    },
  ],

  admin: [
    {
      group: 'HQ Command',
      badge: 'HQ',
      items: [
        { label: 'Battalion Overview', path: '/dashboard', icon: '📊', permission: 'dashboard.view' },
        { label: 'Leaderboard Standing', path: '/leaderboard', icon: '🏆', permission: 'leaderboard.view' },
        { label: 'My Command Profile', path: '/my-profile', icon: '⭐', permission: 'profile.view' },
      ],
    },
    {
      group: 'Organization Hierarchy',
      badge: 'ORG',
      items: [
        { label: 'Cadets Registry', path: '/cadets', icon: '👥', permission: 'cadets.manage' },
        { label: 'Mentors & ANOs', path: '/mentors', icon: '🎖️', permission: 'mentors.manage' },
        { label: 'Battalions & Colleges', path: '/battalions', icon: '🏛️', permission: 'battalions.manage' },
        { label: 'Divisions & Wings', path: '/divisions', icon: '🛡️', permission: 'divisions.manage' },
      ],
    },
    {
      group: 'Training & Operations',
      badge: 'OPS',
      items: [
        { label: '9-Pillar Evaluation HQ', path: '/performance', icon: '🎯', permission: 'performance.manage' },
        { label: 'Parade Attendance Log', path: '/attendance', icon: '📋', permission: 'attendance.manage' },
        { label: 'HQ Tasks & Parades', path: '/tasks', icon: '📅', permission: 'tasks.manage' },
      ],
    },
    {
      group: 'AI Command Suite',
      badge: 'GEN AI',
      items: [
        { label: 'NCC Mock Test Arena', path: '/ncc-mock-tests', icon: '🎯', permission: 'mock_tests.view' },
        { label: 'Student Exam Analytics', path: '/ncc-mock-tests/analytics', icon: '📈', permission: 'mock_tests.view' },
        { label: 'Question Bank Pipeline', path: '/ncc-mock-tests/pipeline', icon: '📊', permission: 'mock_tests.view' },
        { label: 'AI Command Suite', path: '/ai-suite', icon: '🤖', permission: 'ai_suite.manage' },
        { label: 'Books & Syllabus Library', path: '/knowledge', icon: '📚', permission: 'knowledge.view' },
      ],
    },
    {
      group: 'Administration & System',
      badge: 'SYS',
      items: [
        { label: 'Inspection Reports', path: '/reports', icon: '📑', permission: 'reports.manage' },
        { label: 'System Settings', path: '/settings', icon: '⚙️', permission: 'settings.manage' },
      ],
    },
  ],
};

/**
 * Check if a given role has a specific permission
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get navigation groups for a given role, filtered by permissions
 */
export function getNavigationForRole(role) {
  const groups = NAVIGATION_CONFIG[role] || NAVIGATION_CONFIG.cadet;
  const userPermissions = ROLE_PERMISSIONS[role] || [];

  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.permission || userPermissions.includes(item.permission)),
    }))
    .filter(group => group.items.length > 0);
}
