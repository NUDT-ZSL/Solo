import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlPanel from './components/ControlPanel';
import Heatmap3D from './components/Heatmap3D';
import LineChart3D from './components/LineChart3D';
import BarChart3D from './components/BarChart3D';
import { LanguageDataPoint, LanguageName, LANGUAGES, LANGUAGE_COLORS } from './types';
import './App.css';

function TopRightSelector({
  selectedLanguage,
  onLanguageChange
}: {
  selectedLanguage: LanguageName;
  onLanguageChange: (lang: LanguageName) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const options: { value: LanguageName; label: string }[] = [
    { value: 'all', label: '所有语言（平均）' },
    ...LANGUAGES.map(lang => ({ value: lang, label: lang }))
  ];

  return (
    <div className="top-right-selector">
      <button
        className="selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className="selector-dot"
          style={{
            backgroundColor: selectedLanguage === 'all' ? '#00d2ff' : LANGUAGE_COLORS[selectedLanguage]
          }}
        />
        <span className="selector-text">
          {options.find(opt => opt.value === selectedLanguage)?.label}
        </span>
        <span className={`selector-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="selector-dropdown">
          {options.map(option => (
            <button
              key={option.value}
              className={`selector-item ${selectedLanguage === option.value ? 'active' : ''}`}
              onClick={() => {
                onLanguageChange(option.value);
                setIsOpen(false);
              }}
            >
              <span
                className="selector-dot"
                style={{
                  backgroundColor: option.value === 'all' ? '#00d2ff' : LANGUAGE_COLORS[option.value]
                }}
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [data, setData] = useState<LanguageDataPoint[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageName>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/language-trends');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  const heatmapData = useMemo(() => {
    if (data.length === 0) return { values: [], maxValue: 0 };
    const gridSize = 30;
    const values: number[][] = [];
    let maxValue = 0;

    const monthsCount = 120;
    const monthStep = monthsCount / gridSize;

    if (selectedLanguage === 'all') {
      const langStep = LANGUAGES.length / gridSize;
      for (let y = 0; y < gridSize; y++) {
        const row: number[] = [];
        const langIdx = Math.min(Math.floor(y * langStep), LANGUAGES.length - 1);
        const langData = data.filter(d => d.language === LANGUAGES[langIdx]);

        for (let x = 0; x < gridSize; x++) {
          const monthIdx = Math.min(Math.floor(x * monthStep), monthsCount - 1);
          const monthData = langData.find(d => d.monthIndex === monthIdx);
          const val = monthData?.repos || 0;
          row.push(val);
          if (val > maxValue) maxValue = val;
        }
        values.push(row);
      }
    } else {
      const langData = data.filter(d => d.language === selectedLanguage);
      for (let y = 0; y < gridSize; y++) {
        const row: number[] = [];
        for (let x = 0; x < gridSize; x++) {
          const idx = y * gridSize + x;
          const monthIdx = Math.min(Math.floor(idx * monthStep / 3), monthsCount - 1);
          const monthData = langData.find(d => d.monthIndex === monthIdx);
          const val = monthData?.repos || 0;
          row.push(val);
          if (val > maxValue) maxValue = val;
        }
        values.push(row);
      }
    }

    return { values, maxValue };
  }, [data, selectedLanguage]);

  const lineChartData = useMemo(() => {
    if (data.length === 0) return [];
    if (selectedLanguage === 'all') {
      return LANGUAGES.map(lang => {
        const langData = data.filter(d => d.language === lang);
        return {
          language: lang,
          points: langData.map(d => ({ month: d.monthIndex, value: d.contributors }))
        };
      });
    } else {
      const langData = data.filter(d => d.language === selectedLanguage);
      return [{
        language: selectedLanguage,
        points: langData.map(d => ({ month: d.monthIndex, value: d.contributors }))
      }];
    }
  }, [data, selectedLanguage]);

  const barChartData = useMemo(() => {
    if (data.length === 0) return [];
    if (selectedLanguage === 'all') {
      return LANGUAGES.map(lang => {
        const langData = data.filter(d => d.language === lang);
        const totalRepos = langData.reduce((sum, d) => sum + d.repos, 0) / langData.length;
        const totalContributors = langData.reduce((sum, d) => sum + d.contributors, 0) / langData.length;
        const avgResolution = langData.reduce((sum, d) => sum + (d.resolvedIssues / Math.max(d.newIssues, 1)), 0) / langData.length;
        return {
          language: lang,
          repos: totalRepos,
          contributors: totalContributors,
          resolutionRate: avgResolution
        };
      });
    } else {
      const langData = data.filter(d => d.language === selectedLanguage);
      return LANGUAGES.map(lang => {
        if (lang === selectedLanguage) {
          return {
            language: lang,
            repos: langData[langData.length - 1]?.repos || 0,
            contributors: langData[langData.length - 1]?.contributors || 0,
            resolutionRate: langData[langData.length - 1]?.resolvedIssues / Math.max(langData[langData.length - 1]?.newIssues || 1, 1)
          };
        }
        const otherLangData = data.filter(d => d.language === lang);
        return {
          language: lang,
          repos: (otherLangData[otherLangData.length - 1]?.repos || 0) * 0.3,
          contributors: (otherLangData[otherLangData.length - 1]?.contributors || 0) * 0.3,
          resolutionRate: 0.3
        };
      });
    }
  }, [data, selectedLanguage]);

  const handleBarClick = (language: string) => {
    setSelectedLanguage(language as LanguageName);
  };

  return (
    <div className="app-container">
      <ControlPanel
        selectedLanguage={selectedLanguage}
        onLanguageChange={(lang) => {
          setSelectedLanguage(lang);
        }}
        onRefresh={fetchData}
      />
      <div className="scene-container">
        <TopRightSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={(lang) => setSelectedLanguage(lang)}
        />
        <Canvas
          camera={{ position: [18, 14, 18], fov: 50 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#16213e']} />
          <fog attach="fog" args={['#1a1a2e', 25, 55]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[15, 25, 15]} intensity={1.2} color="#00d2ff" />
          <pointLight position={[-10, 15, -10]} intensity={0.6} color="#f12711" />
          <directionalLight position={[5, 15, 5]} intensity={0.4} />
          <pointLight position={[0, 20, 0]} intensity={0.3} color="#f5af19" />

          <Heatmap3D
            data={heatmapData.values}
            maxValue={heatmapData.maxValue}
            position={[-11, 0, -9]}
          />

          <LineChart3D
            data={lineChartData}
            position={[2, 0, -9]}
          />

          <BarChart3D
            data={barChartData}
            position={[11, 0, 1]}
            onBarClick={handleBarClick}
            selectedLanguage={selectedLanguage}
          />

          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            minDistance={8}
            maxDistance={50}
            makeDefault
          />

          <gridHelper args={[50, 50, '#1a3a5c', '#0d2137']} position={[0, -0.01, 0]} />
        </Canvas>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>加载数据中...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
