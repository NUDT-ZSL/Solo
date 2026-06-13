import React from 'react';
import InputPanel from './components/InputPanel';
import PreviewPair from './components/PreviewPair';
import IndicatorPanel from './components/IndicatorPanel';
import SimulationToggle from './components/SimulationToggle';
import { ColorScheme, ColorBlindnessType, applyColorBlindnessToScheme } from './utils/ColorCalculator';

const defaultSchemeA: ColorScheme = {
  primary: '#3B82F6',
  background: '#FFFFFF',
  text: '#111827'
};

const defaultSchemeB: ColorScheme = {
  primary: '#10B981',
  background: '#1F2937',
  text: '#F9FAFB'
};

const App: React.FC = () => {
  const [schemeA, setSchemeA] = React.useState<ColorScheme>(defaultSchemeA);
  const [schemeB, setSchemeB] = React.useState<ColorScheme>(defaultSchemeB);
  const [filterType, setFilterType] = React.useState<ColorBlindnessType>('normal');
  const [previewFilter, setPreviewFilter] = React.useState<string>('none');

  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [isMediumScreen, setIsMediumScreen] = React.useState(false);

  React.useEffect(() => {
    const mq768 = window.matchMedia('(max-width: 768px)');
    const mq1024 = window.matchMedia('(max-width: 1024px)');
    setIsSmallScreen(mq768.matches);
    setIsMediumScreen(mq1024.matches);
    const handler768 = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    const handler1024 = (e: MediaQueryListEvent) => setIsMediumScreen(e.matches);
    mq768.addEventListener('change', handler768);
    mq1024.addEventListener('change', handler1024);
    return () => {
      mq768.removeEventListener('change', handler768);
      mq1024.removeEventListener('change', handler1024);
    };
  }, []);

  const handleFilterChange = (type: ColorBlindnessType) => {
    setPreviewFilter('brightness(1.2) saturate(1.3)');
    setTimeout(() => {
      setFilterType(type);
      setPreviewFilter('none');
    }, 400);
  };

  const displayedSchemeA = applyColorBlindnessToScheme(schemeA, filterType);
  const displayedSchemeB = applyColorBlindnessToScheme(schemeB, filterType);

  return (
    <div style={styles.app}>
      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #111827;
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="#ffffff"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="#ffffff"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="#ffffff"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="#ffffff"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>ColorClash</h1>
            <p style={styles.subtitle}>配色方案对比与可读性分析工具</p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={{
          ...styles.layout,
          flexDirection: isSmallScreen ? 'column' : 'row',
          alignItems: isSmallScreen ? 'center' : 'flex-start'
        }}>
          <InputPanel
            schemeA={schemeA}
            schemeB={schemeB}
            onSchemeAChange={setSchemeA}
            onSchemeBChange={setSchemeB}
            compact={isSmallScreen || isMediumScreen}
          />

          <section style={styles.rightPanel}>
            <SimulationToggle
              currentType={filterType}
              onChange={handleFilterChange}
            />

            <div>
              <PreviewPair
                schemeA={displayedSchemeA}
                schemeB={displayedSchemeB}
                filterValue={previewFilter}
                stacked={isSmallScreen}
              />
            </div>

            <IndicatorPanel
              schemeA={displayedSchemeA}
              schemeB={displayedSchemeB}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#111827',
    color: '#f9fafb',
    fontFamily: "'JetBrains Mono', monospace"
  },
  header: {
    padding: '20px 32px',
    borderBottom: '1px solid #1f2937'
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: -0.5
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: "'JetBrains Mono', monospace"
  },
  main: {
    padding: 28
  },
  layout: {
    display: 'flex',
    gap: 28,
    maxWidth: 1400,
    margin: '0 auto',
    flexWrap: 'wrap'
  },
  rightPanel: {
    flex: 1,
    minWidth: 0
  }
};

export default App;
