import { useState, useEffect } from 'react';
import BottleSend from './BottleSend';
import BottleOpen from './BottleOpen';
import BottleHistory from './BottleHistory';
import type { CapsuleRecord, ViewType } from './types';

const STORAGE_KEY = 'time_capsule_records';

function App() {
  const [view, setView] = useState<ViewType>('send');
  const [records, setRecords] = useState<CapsuleRecord[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch {
        setRecords([]);
      }
    }
  }, []);

  const addRecord = (record: CapsuleRecord) => {
    const newRecords = [record, ...records];
    setRecords(newRecords);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🌊 时间胶囊 · 心情漂流瓶</h1>
        <p style={styles.subtitle}>慢下来，写一段心情，让它穿越时光</p>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setView('send')}
          style={{
            ...styles.navButton,
            ...(view === 'send' ? styles.navButtonActive : {}),
          }}
        >
          📝 投递心情
        </button>
        <button
          onClick={() => setView('open')}
          style={{
            ...styles.navButton,
            ...(view === 'open' ? styles.navButtonActive : {}),
          }}
        >
          ✉️ 拆阅胶囊
        </button>
        <button
          onClick={() => setView('history')}
          style={{
            ...styles.navButton,
            ...(view === 'history' ? styles.navButtonActive : {}),
          }}
        >
          📋 投递记录
        </button>
      </nav>

      <main style={styles.main}>
        {view === 'send' && <BottleSend onSend={addRecord} />}
        {view === 'open' && <BottleOpen />}
        {view === 'history' && <BottleHistory records={records} />}
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>愿每份心情都能被温柔以待 💫</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '40px 20px 20px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#F5E6CC',
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#A8B8CC',
    letterSpacing: '0.5px',
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '20px',
    flexWrap: 'wrap',
  },
  navButton: {
    padding: '10px 20px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#A8B8CC',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #3D5A80 0%, #2A4365 100%)',
    color: '#F5E6CC',
    borderColor: 'rgba(245, 230, 204, 0.3)',
    boxShadow: '0 4px 12px rgba(61, 90, 128, 0.4)',
  },
  main: {
    flex: 1,
    padding: '20px',
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
  },
  footer: {
    padding: '30px 20px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#6B7C93',
  },
};

export default App;
