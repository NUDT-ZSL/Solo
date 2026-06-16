import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { DayPlan, UserLevel, TrainingGoal } from './types';

const TrainingDashboard = lazy(() => import('./components/TrainingDashboard'));
const StatisticsPage = lazy(() => import('./components/StatisticsPage'));

const tabs = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/statistics', label: 'Statistics', icon: '📊' },
  { path: '/plan', label: 'Plan', icon: '📅' },
];

function PlanGeneratorPage() {
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [goal, setGoal] = useState<TrainingGoal>('muscle_gain');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, goal, daysPerWeek }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }
      const data = await res.json();
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Training Plan Generator</h2>
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 14, color: '#666' }}>Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as UserLevel)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 14, color: '#666' }}>Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as TrainingGoal)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            >
              <option value="muscle_gain">Muscle Gain</option>
              <option value="fat_loss">Fat Loss</option>
              <option value="strength">Strength</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 14, color: '#666' }}>Days / Week</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </div>
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#E53935', marginBottom: 16 }}>{error}</div>}

      {plan && (
        <div>
          {plan.map((day) => (
            <div className="card timeline-card" key={day.day} style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>
                Day {day.day} — {day.label}
              </h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                Est. {day.estimatedDuration} min · {day.totalSets} sets
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>Exercise</th>
                    <th style={{ padding: '6px 0' }}>Muscle</th>
                    <th style={{ padding: '6px 0' }}>Sets</th>
                    <th style={{ padding: '6px 0' }}>Reps</th>
                    <th style={{ padding: '6px 0' }}>Rest</th>
                  </tr>
                </thead>
                <tbody>
                  {day.exercises.map((ex) => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '8px 0' }}>{ex.name}</td>
                      <td style={{ padding: '8px 0', textTransform: 'capitalize' }}>{ex.targetMuscle}</td>
                      <td style={{ padding: '8px 0' }}>{ex.sets}</td>
                      <td style={{ padding: '8px 0' }}>{ex.reps}</td>
                      <td style={{ padding: '8px 0' }}>{ex.restSeconds}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeTab = tabs.find((t) => t.path === location.pathname)?.path || '/';

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <nav className="top-nav">
        <span className="logo">GYM LOG</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: 18,
              cursor: 'pointer',
            }}
            title="Settings"
          >
            ⚙
          </button>
          <div className="avatar">U</div>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isMobile && (
          <aside className="sidebar">
            {tabs.map((tab) => (
              <button
                key={tab.path}
                className={`sidebar-item ${activeTab === tab.path ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.path)}
                title={tab.label}
              >
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
              </button>
            ))}
          </aside>
        )}

        <main className="main-content">
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<TrainingDashboard />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/plan" element={<PlanGeneratorPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {isMobile && (
        <nav className="bottom-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              className={`tab-item ${activeTab === tab.path ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.path)}
            >
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{ fontSize: 10 }}>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
