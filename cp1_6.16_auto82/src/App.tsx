import { useState, useEffect } from 'react';
import RecordPanel from './components/RecordPanel';
import FeedbackView from './components/FeedbackView';
import StatsDashboard from './components/StatsDashboard';
import { getUserInfo, UserInfo } from './utils/api';
import { AlignmentResult } from './utils/audioProcessor';

type View = 'record' | 'feedback' | 'stats';

const USER_ID = 'user-001';

function App() {
  const [currentView, setCurrentView] = useState<View>('record');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [feedbackResult, setFeedbackResult] = useState<AlignmentResult | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo(USER_ID);
        setUserInfo(info);
      } catch (e) {
        console.error('Failed to fetch user info:', e);
      }
    };
    fetchUserInfo();
  }, []);

  const handleLanguageChange = (lang: 'en' | 'ja') => {
    setLanguage(lang);
    setSelectedSampleId('');
  };

  const handleLevelChange = (lvl: 1 | 2 | 3) => {
    setLevel(lvl);
    setSelectedSampleId('');
  };

  const handleEvaluationComplete = (result: AlignmentResult) => {
    setFeedbackResult(result);
    setCurrentView('feedback');
  };

  const handleRetry = () => {
    setCurrentView('record');
  };

  const handleBackToRecord = () => {
    setCurrentView('record');
    setFeedbackResult(null);
  };

  const levelLabels: Record<number, string> = {
    1: language === 'en' ? '初级' : '初級',
    2: language === 'en' ? '中级' : '中級',
    3: language === 'en' ? '高级' : '上級'
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>🎤</div>
          <div style={styles.navLabels}>
            <span style={styles.langLabel}>
              {language === 'en' ? '英语' : '日本語'}
            </span>
            <span style={styles.levelLabel}>{levelLabels[level]}</span>
          </div>
        </div>
        <div style={styles.navCenter}>
          <button
            style={{
              ...styles.navButton,
              ...(currentView === 'record' ? styles.navButtonActive : {})
            }}
            onClick={() => setCurrentView('record')}
          >
            录音评测
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(currentView === 'feedback' ? styles.navButtonActive : {})
            }}
            onClick={() => setCurrentView('feedback')}
            disabled={!feedbackResult}
          >
            历史反馈
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(currentView === 'stats' ? styles.navButtonActive : {})
            }}
            onClick={() => setCurrentView('stats')}
          >
            学习统计
          </button>
        </div>
        <div style={styles.navRight}>
          <span style={styles.points}>⭐ {userInfo?.points || 0}</span>
          <div style={styles.avatar}>
            {userInfo?.avatar || '👤'}
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        {currentView === 'record' && (
          <RecordPanel
            language={language}
            level={level}
            selectedSampleId={selectedSampleId}
            onSampleSelect={setSelectedSampleId}
            onLanguageChange={handleLanguageChange}
            onLevelChange={handleLevelChange}
            onEvaluationComplete={handleEvaluationComplete}
            userId={USER_ID}
          />
        )}
        {currentView === 'feedback' && feedbackResult && (
          <FeedbackView
            result={feedbackResult}
            sampleId={selectedSampleId}
            onRetry={handleRetry}
            onBack={handleBackToRecord}
          />
        )}
        {currentView === 'stats' && (
          <StatsDashboard userId={USER_ID} />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'rgba(28, 40, 51, 0.95)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    borderBottom: '1px solid rgba(52, 152, 219, 0.2)'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  logo: {
    fontSize: '28px'
  },
  navLabels: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  langLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ECF0F1'
  },
  levelLabel: {
    fontSize: '12px',
    color: '#95A5A6'
  },
  navCenter: {
    display: 'flex',
    gap: '8px'
  },
  navButton: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#95A5A6',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  navButtonActive: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    color: '#3498DB'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  points: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F1C40F'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid #3498DB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backgroundColor: '#2C3E50'
  },
  main: {
    flex: 1,
    paddingTop: '60px',
    display: 'flex',
    justifyContent: 'center'
  }
};

export default App;
