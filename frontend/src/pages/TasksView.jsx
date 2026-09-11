import { useState } from 'react';
import { Panel, StatCard } from '../components/Form';
import { NccCrest } from '../components/NccLogo';

export default function TasksView() {
  const [filterType, setFilterType] = useState('ALL');

  const tasks = [
    {
      id: 1,
      title: 'Republic Day Camp (RDC-2027) State Selection',
      category: 'CAMP',
      target: 'SW & SD Selected Contingents',
      date: 'Oct 20, 2026',
      time: '06:00 AM IST',
      location: 'State Directorate Headquarters Ground',
      priority: 'HIGH PRIORITY',
      status: 'SCHEDULED',
      desc: 'Screening for Rajpath Marching Contingent, Prime Minister Rally, and Best Cadet Competition.',
    },
    {
      id: 2,
      title: 'Combined Annual Training Camp (CATC - Phase I)',
      category: 'CAMP',
      target: 'All 1st & 2nd Year Cadets',
      date: 'Nov 05 - Nov 14, 2026',
      time: 'Full Time Residency',
      location: 'Battalion Tactical Training Area',
      priority: 'MANDATORY',
      status: 'CONFIRMED',
      desc: '10-day intensive residential camp covering weapon training, obstacle course, firing, and cultural competitions.',
    },
    {
      id: 3,
      title: 'Ceremonial Guard of Honour Rehearsal',
      category: 'PARADE',
      target: 'Guard Squad (24 Cadets)',
      date: 'Every Saturday',
      time: '06:30 AM - 08:30 AM',
      location: 'College Main Quadrangle',
      priority: 'ROUTINE',
      status: 'ONGOING',
      desc: 'Precision drill practice with .303 DP rifles and ceremonial bayonet fixing.',
    },
    {
      id: 4,
      title: 'Thal Sainik Camp (TSC) Obstacle Course Trials',
      category: 'CAMP',
      target: 'SD Cadets (Obstacle Team)',
      date: 'Oct 28, 2026',
      time: '07:00 AM IST',
      location: 'Army Brigade Obstacle Course',
      priority: 'HIGH PRIORITY',
      status: 'UPCOMING',
      desc: 'Clearance testing across 10 standard obstacles: High Wall, Ramp, Double Ditch, Zigzag Balance.',
    },
    {
      id: 5,
      title: 'Blood Donation & Social Service Drive',
      category: 'SOCIAL',
      target: 'All Willing Cadets',
      date: 'Nov 22, 2026',
      time: '09:00 AM - 02:00 PM',
      location: 'Govt Hospital Base',
      priority: 'SERVICE',
      status: 'SCHEDULED',
      desc: 'Community outreach initiative in celebration of NCC Day.',
    },
  ];

  const filteredTasks = tasks.filter(t => filterType === 'ALL' || t.category === filterType);

  return (
    <div>
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
              Master operational calendar for combined training camps, ceremonial parades, weapon training drills, and social initiatives.
            </p>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Active Camp Operations" value="3 Camps" icon="⛺" tone="olive" />
        <StatCard label="Weekly Parade Drills" value="2 Drills/wk" icon="🎖️" tone="primary" />
        <StatCard label="Cadets Mobilized" value="Full Unit" icon="👥" tone="success" />
        <StatCard label="Upcoming Inspections" value="1 Inspection" icon="📋" tone="saffron" />
      </div>

      <Panel title="Filter Operational Tasks" guideTag="CATEGORIES">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Operations ({tasks.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'CAMP' ? 'active' : ''}`}
            onClick={() => setFilterType('CAMP')}
          >
            ⛺ Camps (CATC / RDC / TSC)
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'PARADE' ? 'active' : ''}`}
            onClick={() => setFilterType('PARADE')}
          >
            🎖️ Parade Drills
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'SOCIAL' ? 'active' : ''}`}
            onClick={() => setFilterType('SOCIAL')}
          >
            🤝 Social Service & Community
          </button>
        </div>
      </Panel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredTasks.map(task => (
          <div key={task.id} style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${task.category === 'CAMP' ? 'badge-olive' : task.category === 'PARADE' ? 'badge-navy' : 'badge-saffron'}`}>
                    {task.category}
                  </span>
                  <span className="badge badge-info">{task.priority}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target: <strong>{task.target}</strong></span>
                </div>
                <h3 style={{ fontSize: 17, color: 'var(--navy-900)' }}>{task.title}</h3>
              </div>

              <span className="badge badge-success" style={{ fontSize: 11 }}>{task.status}</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
              {task.desc}
            </p>

            <div style={{
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <span>📅 <strong>Date:</strong> {task.date}</span>
              <span>⏱️ <strong>Time:</strong> {task.time}</span>
              <span>📍 <strong>Location:</strong> {task.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
