import React, { useState, useEffect, useCallback } from 'react';

type ViewMode = 'perspective' | 'free' | 'topdown';

interface UIState {
  timeSlot: number;
  congestionFilter: number;
  region: string;
  viewMode: ViewMode;
}

const eventBus = {
  listeners: new Map<string, Set<Function>>(),
  on(event: string, cb: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  },
  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  },
};

export { eventBus };

const regionOptions = [
  { key: 'all', label: '全部' },
  { key: 'east', label: '东' },
  { key: 'south', label: '南' },
  { key: 'west', label: '西' },
  { key: 'north', label: '北' },
];

const viewModes: { key: ViewMode; label: string }[] = [
  { key: 'perspective', label: '俯瞰45°' },
  { key: 'free', label: '自由旋转' },
  { key: 'topdown', label: '俯视90°' },
];

const UIPanel: React.FC = () => {
  const [timeSlot, setTimeSlot] = useState(12);
  const [congestionFilter, setCongestionFilter] = useState(0);
  const [region, setRegion] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTopdown, setIsTopdown] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((config: UIState) => {
        if (config.timeSlot !== undefined) {
          setTimeSlot(config.timeSlot);
          eventBus.emit('timeChange', config.timeSlot);
        }
        if (config.congestionFilter !== undefined) {
          setCongestionFilter(config.congestionFilter);
          eventBus.emit('congestionChange', config.congestionFilter);
        }
        if (config.region !== undefined) {
          setRegion(config.region);
          eventBus.emit('regionChange', config.region);
        }
        if (config.viewMode !== undefined) {
          setViewMode(config.viewMode);
          setIsTopdown(config.viewMode === 'topdown');
          eventBus.emit('viewModeChange', config.viewMode);
        }
      })
      .catch(() => {});
  }, []);

  const handleTimeChange = useCallback((val: number) => {
    setTimeSlot(val);
    eventBus.emit('timeChange', val);
  }, []);

  const handleCongestionChange = useCallback((val: number) => {
    setCongestionFilter(val);
    eventBus.emit('congestionChange', val);
  }, []);

  const handleRegionChange = useCallback((val: string) => {
    setRegion(val);
    eventBus.emit('regionChange', val);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setIsTopdown(mode === 'topdown');
    eventBus.emit('viewModeChange', mode);
  }, []);

  const handleReset = useCallback(() => {
    setTimeSlot(12);
    setCongestionFilter(0);
    setRegion('all');
    setViewMode('perspective');
    setIsTopdown(false);
    eventBus.emit('resetView');
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlot,
          congestionFilter,
          region,
          viewMode,
          cameraPosition: { x: 0, y: 40, z: 40 },
        }),
      });
    } catch (e) {
      console.error('Save failed', e);
    }
    setTimeout(() => setSaving(false), 500);
  }, [timeSlot, congestionFilter, region, viewMode]);

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 12px',
        fontSize: '14px',
        color: '#ffffff',
        pointerEvents: 'auto',
        transition: 'all 0.2s ease',
      }
    : {
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '280px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '20px',
        color: '#ffffff',
        pointerEvents: 'auto',
        transition: 'all 0.2s ease',
        zIndex: 100,
      };

  const labelStyle: React.CSSProperties = {
    color: '#90caf9',
    fontSize: isMobile ? '12px' : '13px',
    marginBottom: '4px',
    display: 'block',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#42a5f5',
    cursor: 'pointer',
  };

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    borderRadius: '8px',
    padding: isMobile ? '4px 8px' : '6px 12px',
    cursor: 'pointer',
    fontSize: isMobile ? '12px' : '13px',
    transition: 'all 0.2s ease',
  };

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
  };

  if (isTopdown && !isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '6px',
          background: '#e0e0e0',
          borderRadius: '3px',
          pointerEvents: 'auto',
          zIndex: 100,
        }}
      >
        <input
          type="range"
          min={0}
          max={23}
          step={1}
          value={timeSlot}
          onChange={e => handleTimeChange(Number(e.target.value))}
          style={{
            width: '300px',
            height: '6px',
            accentColor: '#42a5f5',
            position: 'absolute',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            cursor: 'pointer',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
          }}
        />
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {!isMobile && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <span style={labelStyle}>
              当前时间：{String(timeSlot).padStart(2, '0')}:00
            </span>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={timeSlot}
              onChange={e => handleTimeChange(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={labelStyle}>拥堵过滤</span>
            <select
              value={congestionFilter}
              onChange={e => handleCongestionChange(Number(e.target.value))}
              style={selectStyle}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i} style={{ background: '#1a1a2e', color: '#fff' }}>
                  {i === 0 ? '全部' : `${i}级`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={labelStyle}>区域选择</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {regionOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleRegionChange(opt.key)}
                  style={{
                    ...btnStyle,
                    background:
                      region === opt.key
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    borderColor:
                      region === opt.key
                        ? 'rgba(144,202,249,0.6)'
                        : 'rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={e =>
                    ((e.target as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.15)')
                  }
                  onMouseLeave={e =>
                    ((e.target as HTMLButtonElement).style.background =
                      region === opt.key
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.05)')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={labelStyle}>视角切换</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {viewModes.map(vm => (
                <button
                  key={vm.key}
                  onClick={() => handleViewModeChange(vm.key)}
                  style={{
                    ...btnStyle,
                    background:
                      viewMode === vm.key
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    borderColor:
                      viewMode === vm.key
                        ? 'rgba(144,202,249,0.6)'
                        : 'rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={e =>
                    ((e.target as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.15)')
                  }
                  onMouseLeave={e =>
                    ((e.target as HTMLButtonElement).style.background =
                      viewMode === vm.key
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.05)')
                  }
                >
                  {vm.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReset}
              style={btnStyle}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.15)')
              }
              onMouseLeave={e =>
                ((e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.08)')
              }
            >
              重置视图
            </button>
            <button
              onClick={handleSave}
              style={btnStyle}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.15)')
              }
              onMouseLeave={e =>
                ((e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.08)')
              }
            >
              {saving ? '✓' : '💾'} 保存配置
            </button>
          </div>
        </>
      )}

      {isMobile && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
            <span style={{ ...labelStyle, marginBottom: '2px' }}>
              {String(timeSlot).padStart(2, '0')}:00
            </span>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={timeSlot}
              onChange={e => handleTimeChange(Number(e.target.value))}
              style={{ width: '60px', accentColor: '#42a5f5' }}
            />
          </div>
          <select
            value={congestionFilter}
            onChange={e => handleCongestionChange(Number(e.target.value))}
            style={{ ...selectStyle, width: '50px', padding: '4px' }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i} style={{ background: '#1a1a2e', color: '#fff' }}>
                {i === 0 ? '全' : `${i}`}
              </option>
            ))}
          </select>
          {regionOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleRegionChange(opt.key)}
              style={{
                ...btnStyle,
                padding: '3px 6px',
                background:
                  region === opt.key
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.05)',
                borderColor:
                  region === opt.key
                    ? 'rgba(144,202,249,0.6)'
                    : 'rgba(255,255,255,0.2)',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button onClick={handleReset} style={{ ...btnStyle, padding: '3px 6px' }}>
            重置
          </button>
          <button onClick={handleSave} style={{ ...btnStyle, padding: '3px 6px' }}>
            {saving ? '✓' : '💾'}
          </button>
        </>
      )}
    </div>
  );
};

export default UIPanel;
