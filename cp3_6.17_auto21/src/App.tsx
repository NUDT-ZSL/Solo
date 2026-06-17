import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ExamPanel from './components/ExamPanel';
import ResultDashboard from './components/ResultDashboard';
import AdminPanel from './components/AdminPanel';

const subjectList = [
  { name: 'Java基础', color: '#3182ce', icon: '☕' },
  { name: '项目管理', color: '#00b5d8', icon: '📊' },
  { name: '网络安全', color: '#e53e3e', icon: '🔒' },
];

export default function App() {
  const [examineeId, setExamineeId] = React.useState(() => {
    return localStorage.getItem('examineeId') || '';
  });

  const handleSetExamineeId = (id: string) => {
    setExamineeId(id);
    localStorage.setItem('examineeId', id);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage examineeId={examineeId} onSetExamineeId={handleSetExamineeId} />} />
        <Route path="/exam" element={<ExamPanel examineeId={examineeId} />} />
        <Route path="/result" element={<ResultDashboard />} />
        <Route path="/history" element={<HistoryPage examineeId={examineeId} />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomePage({ examineeId, onSetExamineeId }: { examineeId: string; onSetExamineeId: (id: string) => void }) {
  const [inputId, setInputId] = React.useState(examineeId);
  const [history, setHistory] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (examineeId) {
      fetch(`/api/history?examineeId=${encodeURIComponent(examineeId)}`)
        .then(res => res.json())
        .then(setHistory)
        .catch(() => {});
    }
  }, [examineeId]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>职业资格在线模拟考试</h1>
        <p style={styles.subtitle}>选择科目，开始你的模拟考试之旅</p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            placeholder="请输入考生ID"
            value={inputId}
            onChange={e => setInputId(e.target.value)}
            onBlur={() => { if (inputId.trim()) onSetExamineeId(inputId.trim()); }}
            onKeyDown={e => { if (e.key === 'Enter' && inputId.trim()) onSetExamineeId(inputId.trim()); }}
          />
        </div>

        <div style={styles.cardGrid}>
          {subjectList.map(s => (
            <Link key={s.name} to={`/exam?subject=${encodeURIComponent(s.name)}`} style={{ textDecoration: 'none' }}>
              <div style={{ ...styles.subjectCard, borderColor: s.color }}>
                <div style={styles.subjectIcon}>{s.icon}</div>
                <div style={styles.subjectName}>{s.name}</div>
                <div style={styles.subjectDesc}>30题 · 60分钟</div>
              </div>
            </Link>
          ))}
        </div>

        {examineeId && history.length > 0 && (
          <div style={{ marginTop: 32, width: '100%', maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#2d3748', fontSize: 18 }}>最近考试记录</h3>
              <Link to="/history" style={{ color: '#3182ce', fontSize: 14 }}>查看全部 →</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {history.slice(0, 3).map((h: any) => (
                <div key={h.id} style={styles.historyCard}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{h.subject}</div>
                    <div style={{ fontSize: 13, color: '#718096' }}>{h.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: h.score >= 60 ? '#38a169' : '#e53e3e' }}>{h.score}分</div>
                    <div style={{ fontSize: 12, color: '#a0aec0' }}>用时{h.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <Link to="/admin" style={{ color: '#a0aec0', fontSize: 13 }}>管理后台</Link>
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ examineeId }: { examineeId: string }) {
  const [records, setRecords] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (examineeId) {
      fetch(`/api/history?examineeId=${encodeURIComponent(examineeId)}`)
        .then(res => res.json())
        .then(setRecords)
        .catch(() => {});
    }
  }, [examineeId]);

  return (
    <div style={styles.page}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/" style={{ color: '#3182ce', fontSize: 14 }}>← 返回首页</Link>
          <h2 style={{ color: '#2d3748' }}>历史成绩</h2>
        </div>
        {records.length === 0 ? (
          <p style={{ color: '#a0aec0', textAlign: 'center', marginTop: 60 }}>暂无考试记录</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {records.map((r: any) => (
              <div key={r.id} style={styles.historyCard}>
                <div>
                  <div style={{ fontWeight: 600, color: '#2d3748' }}>{r.subject}</div>
                  <div style={{ fontSize: 13, color: '#718096' }}>{r.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: r.score >= 60 ? '#38a169' : '#e53e3e' }}>{r.score}分</div>
                  <div style={{ fontSize: 12, color: '#a0aec0' }}>用时{r.duration}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '60px 16px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    color: '#718096',
    fontSize: 16,
    marginBottom: 32,
  },
  inputRow: {
    marginBottom: 32,
  },
  input: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 15,
    width: 260,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  cardGrid: {
    display: 'flex',
    gap: 20,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  subjectCard: {
    width: 200,
    padding: '28px 20px',
    borderRadius: 12,
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  subjectIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: 4,
  },
  subjectDesc: {
    fontSize: 13,
    color: '#a0aec0',
  },
  historyCard: {
    width: 320,
    height: 80,
    borderRadius: 12,
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  },
};
