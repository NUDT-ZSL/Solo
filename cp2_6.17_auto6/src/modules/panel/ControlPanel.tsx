import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEEGContext } from '../../context/EEGContext';
import PowerSpectrumChart from './PowerSpectrumChart';
import type { BrainRegion } from '../../types';
import { REGION_INFO } from '../../types';

function ControlPanel() {
  const {
    eegData,
    timeOffset,
    setTimeOffset,
    flowSpeed,
    setFlowSpeed,
    isLoading,
    error
  } = useEEGContext();

  const [chartData, setChartData] = useState<Record<BrainRegion, number[]>>({
    frontal: Array(128).fill(0),
    parietal: Array(128).fill(0),
    temporal: Array(128).fill(0),
    occipital: Array(128).fill(0)
  });

  const lastUpdateRef = useRef(0);
  const regions: BrainRegion[] = ['frontal', 'parietal', 'temporal', 'occipital'];

  useEffect(() => {
    if (!eegData) return;

    const now = Date.now();
    if (now - lastUpdateRef.current >= 1000) {
      setChartData({
        frontal: [...eegData.data.frontal],
        parietal: [...eegData.data.parietal],
        temporal: [...eegData.data.temporal],
        occipital: [...eegData.data.occipital]
      });
      lastUpdateRef.current = now;
    }
  }, [eegData]);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTimeOffset(value);
  }, [setTimeOffset]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFlowSpeed(value);
  }, [setFlowSpeed]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>脑电波控制面板</h2>
        <p style={styles.subtitle}>EEG Control Panel</p>
      </div>

      {isLoading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>正在加载数据...</span>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          <span>⚠ {error}</span>
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>功率谱密度</h3>
        <p style={styles.sectionSubtitle}>Power Spectral Density</p>

        <div style={styles.chartsContainer}>
          {regions.map((region) => (
            <PowerSpectrumChart
              key={region}
              data={chartData[region]}
              region={region}
              width={260}
              height={100}
            />
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>时间轴</h3>
        <p style={styles.sectionSubtitle}>Timeline ({timeOffset.toFixed(1)}s / 60s)</p>

        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max="60"
            step="0.1"
            value={timeOffset}
            onChange={handleTimeChange}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span style={styles.sliderLabel}>0s</span>
            <span style={styles.sliderLabel}>30s</span>
            <span style={styles.sliderLabel}>60s</span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>光弧流动速度</h3>
        <p style={styles.sectionSubtitle}>Flow Speed ({flowSpeed.toFixed(1)}x)</p>

        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={flowSpeed}
            onChange={handleSpeedChange}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span style={styles.sliderLabel}>0.5x</span>
            <span style={styles.sliderLabel}>1.75x</span>
            <span style={styles.sliderLabel}>3x</span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>脑区概览</h3>
        <div style={styles.regionList}>
          {regions.map((region) => {
            const info = REGION_INFO[region];
            const data = eegData?.data[region] || [];
            const avg = data.length > 0
              ? data.reduce((a, b) => a + b, 0) / data.length
              : 0;
            const peak = data.length > 0
              ? Math.max(...data.map(Math.abs))
              : 0;

            return (
              <div key={region} style={styles.regionItem}>
                <div style={styles.regionInfo}>
                  <div style={{ ...styles.regionDot, backgroundColor: info.color }} />
                  <div>
                    <div style={styles.regionName}>{info.nameCN}</div>
                    <div style={styles.regionNameEn}>{info.name}</div>
                  </div>
                </div>
                <div style={styles.regionStats}>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>均值</span>
                    <span style={styles.statValue}>{avg.toFixed(2)} µV</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>峰值</span>
                    <span style={{
                      ...styles.statValue,
                      color: peak >= 40 ? '#ff4757' : '#ffffff'
                    }}>{peak.toFixed(2)} µV</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    padding: '20px',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #2a2a5a'
  },
  title: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 600,
    margin: 0
  },
  subtitle: {
    color: '#8888aa',
    fontSize: '12px',
    margin: '4px 0 0 0'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #2a2a5a',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#8888aa',
    fontSize: '14px'
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(255, 71, 87, 0.1)',
    border: '1px solid #ff4757',
    borderRadius: '8px',
    color: '#ff4757',
    fontSize: '14px',
    marginBottom: '16px'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px 0'
  },
  sectionSubtitle: {
    color: '#8888aa',
    fontSize: '11px',
    margin: '0 0 12px 0'
  },
  chartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sliderContainer: {
    padding: '0 4px'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#2a2a5a',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none'
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '6px'
  },
  sliderLabel: {
    color: '#6666aa',
    fontSize: '10px'
  },
  regionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  regionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(10, 10, 30, 0.5)',
    borderRadius: '8px',
    border: '1px solid #2a2a5a'
  },
  regionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  regionDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  regionName: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500
  },
  regionNameEn: {
    color: '#6666aa',
    fontSize: '10px'
  },
  regionStats: {
    display: 'flex',
    gap: '16px'
  },
  stat: {
    textAlign: 'right'
  },
  statLabel: {
    display: 'block',
    color: '#6666aa',
    fontSize: '10px'
  },
  statValue: {
    display: 'block',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '2px'
  }
};

export default ControlPanel;
