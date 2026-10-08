import { useState, useEffect, useCallback } from 'react';
import { Panel, StatCard, ErrorBanner, SuccessBanner } from '../components/Form';
import { NccCrest } from '../components/NccLogo';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RefreshingBuffer from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';

/**
 * TasksView Component
 * 
 * Master operational calendar for combined training camps, ceremonial parades,
 * weapon training drills, and social service initiatives.
 * Backed by authentic relational database records in `training_tasks` table.
 */
export default function TasksView() {
  const { user } = useAuth();
  const isAdminOrMentor = user && ['admin', 'mentor', 'co', 'co_admin'].includes(user.role);

  const [tasks, setTasks] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'CAMP',
    target: 'All Cadets',
    date: '',
    time: '06:00 AM IST',
    location: 'Battalion Parade Ground',
    priority: 'HIGH PRIORITY',
    status: 'SCHEDULED',
    desc: '',
  });

  const loadTasks = useCallback(async () => {
    setError('');
    try {
      const data = await api.listTrainingTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load operational tasks calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time synchronization whenever tasks are added/updated anywhere
  useDataSync(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((t) => filterType === 'ALL' || t.category === filterType);

  // Dynamic Metrics
  const activeCamps = tasks.filter((t) => t.category === 'CAMP' && t.status !== 'COMPLETED').length;
  const weeklyParades = tasks.filter((t) => t.category === 'PARADE' && t.status !== 'COMPLETED').length;
  const completedEvents = tasks.filter((t) => t.status === 'COMPLETED').length;

  /**
   * Create new operational task in DBMS
   */
  async function handleCreateTask(e) {
    e.preventDefault();
    if (!isAdminOrMentor) return;
    setSavingTask(true);
    setError('');
    try {
      await api.createTrainingTask(newTask);
      setSuccess(`Training task "${newTask.title}" published successfully!`);
      setShowAddModal(false);
      setNewTask({
        title: '',
        category: 'CAMP',
        target: 'All Cadets',
        date: '',
        time: '06:00 AM IST',
        location: 'Battalion Parade Ground',
        priority: 'HIGH PRIORITY',
        status: 'SCHEDULED',
        desc: '',
      });
      loadTasks();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to publish training task.');
    } finally {
      setSavingTask(false);
    }
  }

  /**
   * Update task status (e.g. SCHEDULED -> CONFIRMED -> ONGOING -> COMPLETED)
   */
  async function handleUpdateStatus(taskId, nextStatus) {
    try {
      await api.updateTrainingTask(taskId, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      setSuccess('Task status updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Could not update task status.');
    }
  }

  /**
   * Delete task
   */
  async function handleDeleteTask(taskId) {
    if (!window.confirm('Are you sure you want to remove this operational task?')) return;
    try {
      await api.deleteTrainingTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSuccess('Task removed from training calendar.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>TRAINING OPS & CALENDAR OF EVENTS</span>
            </div>
            <h2>Tasks & Parade Schedule</h2>
            <p>
              Master operational calendar for combined training camps, ceremonial parades, weapon training drills, and social initiatives. Live relational database records.
            </p>
          </div>
        </div>

        {isAdminOrMentor && (
          <button
            className="primary"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '9px 18px', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>➕ Schedule Event / Camp</span>
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {/* Dynamic Summary Cards */}
      <div className="stat-grid">
        <StatCard label="Active Camp Operations" value={`${activeCamps} Camps`} icon="⛺" tone="olive" />
        <StatCard label="Scheduled Parades" value={`${weeklyParades} Parades`} icon="🎖️" tone="primary" />
        <StatCard label="Total Calendar Events" value={`${tasks.length} Events`} icon="📋" tone="success" />
        <StatCard label="Completed Operations" value={`${completedEvents} Completed`} icon="✅" tone="saffron" />
      </div>

      {/* Filter Bar */}
      <Panel title="Filter Operational Tasks" guideTag="CATEGORIES">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'CAMP', 'PARADE', 'DRILL', 'SOCIAL'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${filterType === cat ? 'active' : ''}`}
              onClick={() => setFilterType(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: filterType === cat ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                background: filterType === cat ? '#eff6ff' : '#FFFFFF',
                color: filterType === cat ? '#1d4ed8' : '#475569',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {cat === 'ALL' ? 'All Events' : cat}
            </button>
          ))}
        </div>
      </Panel>

      {/* Tasks List */}
      {loading ? (
        <RefreshingBuffer message="Loading Master Operational Calendar from DBMS…" minHeight={300} />
      ) : filteredTasks.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No scheduled operations found for the selected category.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTasks.map((t) => {
            const isCompleted = t.status === 'COMPLETED';
            return (
              <div
                key={t.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: 20,
                  boxShadow: 'var(--shadow-xs)',
                  opacity: isCompleted ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: t.category === 'CAMP' ? '#fef3c7' : t.category === 'PARADE' ? '#eff6ff' : '#ecfdf5',
                        color: t.category === 'CAMP' ? '#92400e' : t.category === 'PARADE' ? '#1d4ed8' : '#065f46',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {t.category}
                    </span>
                    <span
                      style={{
                        background: t.priority === 'MANDATORY' ? '#fee2e2' : '#f1f5f9',
                        color: t.priority === 'MANDATORY' ? '#b91c1c' : '#475569',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {t.priority}
                    </span>
                    <span
                      style={{
                        background: isCompleted ? '#dcfce7' : '#eff6ff',
                        color: isCompleted ? '#15803d' : '#1d4ed8',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {t.status}
                    </span>
                  </div>

                  {isAdminOrMentor && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'COMPLETED')}
                          style={{
                            padding: '4px 10px',
                            background: '#ecfdf5',
                            color: '#15803d',
                            border: '1px solid #a7f3d0',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Mark Completed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 6px 0' }}>
                  {t.title}
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                  {t.desc}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 8,
                    background: 'var(--bg-main)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Date & Time: </strong>
                    <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>{t.date} • {t.time}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Location: </strong>
                    <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>{t.location}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Target Squad: </strong>
                    <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>{t.target}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Schedule New Task */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy-900)', margin: 0 }}>
                Schedule Training Event / Camp
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Operation / Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Combined Annual Training Camp (CATC - Phase II)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="CAMP">CAMP (Residency / Tactical)</option>
                    <option value="PARADE">PARADE (Ceremonial)</option>
                    <option value="DRILL">DRILL (Squad Training)</option>
                    <option value="SOCIAL">SOCIAL (Community Outreach)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Priority Level
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="MANDATORY">MANDATORY</option>
                    <option value="HIGH PRIORITY">HIGH PRIORITY</option>
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Scheduled Date *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    placeholder="e.g. Nov 15, 2026 or Every Saturday"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    placeholder="e.g. 06:30 AM - 08:30 AM"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Location / Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.location}
                    onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                    placeholder="e.g. Battalion Parade Ground"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Target Squad / Contingent
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.target}
                    onChange={(e) => setNewTask({ ...newTask, target: e.target.value })}
                    placeholder="e.g. All 2nd Year Cadets"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Directives & Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newTask.desc}
                  onChange={(e) => setNewTask({ ...newTask, desc: e.target.value })}
                  placeholder="Outline the operational goals, uniforms, and mandatory directives..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                >
                  {savingTask ? 'Publishing…' : 'Publish Event ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
