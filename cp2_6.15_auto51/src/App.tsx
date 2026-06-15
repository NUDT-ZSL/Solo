import { useState, useEffect, useCallback } from 'react';
import { Settings, X, Key } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ReportGenerator from './reportGenerator';
import {
  fetchAllPlatforms,
  fetchPlatformRecords,
  savePlatformConfig,
  generateYearlyReport,
} from './aggregator';
import type { Platform, SongRecord, YearlyReport } from './types';

export default function App() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [records, setRecords] = useState<Record<string, SongRecord[]>>({});
  const [report, setReport] = useState<YearlyReport | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAllPlatforms().then(setPlatforms).catch(console.error);
  }, []);

  const loadAllRecords = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords: Record<string, SongRecord[]> = {};
      const allFlatRecords: SongRecord[] = [];

      for (const p of platforms) {
        const pRecords = await fetchPlatformRecords(p.id);
        allRecords[p.id] = pRecords;
        allFlatRecords.push(...pRecords);
      }

      setRecords(allRecords);
      const yearlyReport = generateYearlyReport(allFlatRecords);
      setReport(yearlyReport);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, [platforms]);

  useEffect(() => {
    if (platforms.length > 0) {
      loadAllRecords();
    }
  }, [platforms, loadAllRecords]);

  const togglePlatform = useCallback((id: string) => {
    if (isMobile) {
      setActiveMobileTab((prev) => (prev === id ? null : id));
    } else {
      setExpandedPlatforms((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }, [isMobile]);

  const handleSaveConfig = useCallback(async () => {
    for (const [platformId, token] of Object.entries(tokenInputs)) {
      if (token.trim()) {
        await savePlatformConfig(platformId, token.trim());
      }
    }
    setShowSettings(false);
    setTokenInputs({});
    loadAllRecords();
  }, [tokenInputs, loadAllRecords]);

  return (
    <div className="app-root">
      <div className="app-layout">
        <Sidebar
          platforms={platforms}
          records={records}
          expandedPlatforms={expandedPlatforms}
          onTogglePlatform={togglePlatform}
          onSettingsClick={() => setShowSettings(true)}
          isMobile={isMobile}
          activeMobileTab={activeMobileTab}
        />

        <main className="app-main">
          {loading ? (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <div className="loading-text">正在加载您的音乐数据...</div>
            </div>
          ) : (
            <ReportGenerator report={report} platforms={platforms} />
          )}
        </main>
      </div>

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <div className="settings-title">
                <Settings size={20} />
                平台配置
              </div>
              <button
                className="settings-close"
                onClick={() => setShowSettings(false)}
              >
                <X size={20} color="#666" />
              </button>
            </div>
            <div className="settings-body">
              {platforms.map((p) => (
                <div key={p.id} className="settings-platform-row">
                  <div
                    className="settings-platform-icon"
                    style={{ background: p.color }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="settings-platform-input-wrapper">
                    <Key size={14} color="#999" />
                    <input
                      type="text"
                      className="settings-input"
                      placeholder={`输入 ${p.name} API Token`}
                      value={tokenInputs[p.id] || ''}
                      onChange={(e) =>
                        setTokenInputs((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="settings-footer">
              <button
                className="settings-save-btn"
                onClick={handleSaveConfig}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
