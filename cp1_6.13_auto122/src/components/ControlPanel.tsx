import React, { useState, useEffect, useMemo } from 'react';
import { useScene, Building } from '../App';

interface ControlPanelProps {
  selectedBuilding: Building | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ selectedBuilding }) => {
  const {
    sunAltitude,
    setSunAltitude,
    sunAzimuth,
    setSunAzimuth,
    currentDateTime,
    isAddingMode,
    setIsAddingMode,
    buildings,
    updateBuilding,
    removeBuilding,
    saveLayout,
    loadLayout,
    listLayouts,
  } = useScene();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [savedLayouts, setSavedLayouts] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const formatDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const handleAddBuilding = () => {
    setIsAddingMode(!isAddingMode);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedBuilding) {
      updateBuilding(selectedBuilding.id, { color: e.target.value });
    }
  };

  const handleSizeChange = (dim: 'width' | 'depth' | 'height', value: string) => {
    if (!selectedBuilding) return;
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      updateBuilding(selectedBuilding.id, { [dim]: num });
    }
  };

  const handleSave = async () => {
    if (!layoutName.trim()) return;
    setSaveStatus('saving');
    try {
      await saveLayout(layoutName.trim());
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowSaveDialog(false);
        setLayoutName('');
        refreshLayouts();
      }, 1000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };

  const refreshLayouts = async () => {
    const layouts = await listLayouts();
    setSavedLayouts(layouts || []);
  };

  const handleLoad = async (id: string) => {
    await loadLayout(id);
    setShowLoadDialog(false);
  };

  const panelContent = (
    <div style={panelInnerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>🏙️ 日照分析工具</span>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <button style={{ ...btnPrimaryStyle, background: isAddingMode ? '#0284c7' : '#0ea5e9' }} onClick={handleAddBuilding}>
          {isAddingMode ? '✕ 取消放置' : '+ 添加建筑'}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={btnSecondaryStyle} onClick={() => { setShowSaveDialog(true); refreshLayouts(); }}>
            💾 保存
          </button>
          <button style={btnSecondaryStyle} onClick={() => { setShowLoadDialog(true); refreshLayouts(); }}>
            📂 加载
          </button>
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <div style={labelStyle}>☀️ 太阳角度</div>

        <div style={sliderRowStyle}>
          <div style={sliderLabelStyle}>高度角: {sunAltitude.toFixed(0)}°</div>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={sunAltitude}
            onChange={(e) => setSunAltitude(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={sliderRowStyle}>
          <div style={sliderLabelStyle}>方位角: {sunAzimuth.toFixed(0)}°</div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={sunAzimuth}
            onChange={(e) => setSunAzimuth(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <div style={labelStyle}>📅 当前时间</div>
        <div style={dateTimeStyle}>{formatDateTime(currentDateTime)}</div>
      </div>

      {selectedBuilding && (
        <>
          <div style={dividerStyle} />
          <div style={sectionStyle}>
            <div style={labelStyle}>🏢 {selectedBuilding.name}</div>

            <div style={propertyRowStyle}>
              <span style={propertyLabelStyle}>宽度</span>
              <input
                type="number"
                value={selectedBuilding.width}
                onChange={(e) => handleSizeChange('width', e.target.value)}
                style={inputStyle}
                min="1"
                step="0.5"
              />
              <span style={propertyUnitStyle}>单位</span>
            </div>

            <div style={propertyRowStyle}>
              <span style={propertyLabelStyle}>深度</span>
              <input
                type="number"
                value={selectedBuilding.depth}
                onChange={(e) => handleSizeChange('depth', e.target.value)}
                style={inputStyle}
                min="1"
                step="0.5"
              />
              <span style={propertyUnitStyle}>单位</span>
            </div>

            <div style={propertyRowStyle}>
              <span style={propertyLabelStyle}>高度</span>
              <input
                type="number"
                value={selectedBuilding.height}
                onChange={(e) => handleSizeChange('height', e.target.value)}
                style={inputStyle}
                min="1"
                step="0.5"
              />
              <span style={propertyUnitStyle}>单位</span>
            </div>

            <div style={propertyRowStyle}>
              <span style={propertyLabelStyle}>颜色</span>
              <input
                type="color"
                value={selectedBuilding.color}
                onChange={handleColorChange}
                style={colorPickerStyle}
              />
              <span style={{ ...propertyUnitStyle, fontFamily: 'monospace', fontSize: 12 }}>
                {selectedBuilding.color}
              </span>
            </div>

            <button
              style={{ ...btnDangerStyle, marginTop: 12 }}
              onClick={() => removeBuilding(selectedBuilding.id)}
            >
              🗑️ 删除建筑
            </button>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      <div style={infoStyle}>
        <div>建筑数量: <span style={{ color: '#38bdf8' }}>{buildings.length}</span> / 50</div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
          左键旋转 · 右键平移 · 滚轮缩放
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <>
          {mobileExpanded && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 999,
              }}
              onClick={() => setMobileExpanded(false)}
            />
          )}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: mobileExpanded ? 'auto' : 64,
              maxHeight: mobileExpanded ? '80vh' : 64,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderTop: '1px solid #1e293b',
              zIndex: 1000,
              overflowY: mobileExpanded ? 'auto' : 'hidden',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '0 16px',
              }}
            >
              <button style={mobileBtnStyle} onClick={handleAddBuilding}>
                <span style={{ fontSize: 20 }}>{isAddingMode ? '✕' : '➕'}</span>
              </button>
              <button style={mobileBtnStyle} onClick={() => setMobileExpanded(!mobileExpanded)}>
                <span style={{ fontSize: 20 }}>⚙️</span>
              </button>
              <button style={mobileBtnStyle} onClick={() => { setShowSaveDialog(true); refreshLayouts(); }}>
                <span style={{ fontSize: 20 }}>💾</span>
              </button>
            </div>
            {mobileExpanded && (
              <div style={{ padding: '0 16px 24px' }}>
                {panelContent}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={panelStyle}>
          {panelContent}
        </div>
      )}

      {showSaveDialog && (
        <div style={modalOverlayStyle} onClick={() => setShowSaveDialog(false)}>
          <div style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalTitleStyle}>保存布局方案</div>
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="输入布局名称..."
              style={dialogInputStyle}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnSecondaryStyle} onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
              <button
                style={{
                  ...btnPrimaryStyle,
                  opacity: saveStatus === 'saving' ? 0.7 : 1,
                  background: saveStatus === 'success' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#0ea5e9',
                }}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '✓ 已保存' : saveStatus === 'error' ? '✕ 失败' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div style={modalOverlayStyle} onClick={() => setShowLoadDialog(false)}>
          <div style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalTitleStyle}>加载布局方案</div>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
              {savedLayouts.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                  暂无保存的布局
                </div>
              ) : (
                savedLayouts.map((layout: any) => (
                  <div
                    key={layout._id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => handleLoad(layout._id)}
                  >
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{layout.name}</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                        {layout.buildingCount} 栋建筑
                      </div>
                    </div>
                    <span style={{ color: '#38bdf8' }}>→</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 16,
  width: 280,
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  padding: 16,
  color: '#e2e8f0',
  zIndex: 100,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
};

const panelInnerStyle: React.CSSProperties = {
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(148, 163, 184, 0.15)',
  margin: '12px 0',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#94a3b8',
  marginBottom: 8,
};

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  background: '#0ea5e9',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const btnSecondaryStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: 'rgba(51, 65, 85, 0.6)',
  color: '#e2e8f0',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const btnDangerStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const sliderRowStyle: React.CSSProperties = {
  marginBottom: 10,
};

const sliderLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#cbd5e1',
  marginBottom: 6,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  appearance: 'none',
  WebkitAppearance: 'none',
  background: '#334155',
  borderRadius: 3,
  outline: 'none',
  cursor: 'pointer',
  accentColor: '#0ea5e9',
};

const dateTimeStyle: React.CSSProperties = {
  fontSize: 14,
  fontFamily: 'monospace',
  color: '#38bdf8',
  background: 'rgba(14, 165, 233, 0.1)',
  padding: '8px 12px',
  borderRadius: 8,
  textAlign: 'center',
  border: '1px solid rgba(14, 165, 233, 0.2)',
};

const propertyRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
};

const propertyLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  width: 40,
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 13,
  outline: 'none',
};

const propertyUnitStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
  width: 32,
  flexShrink: 0,
};

const colorPickerStyle: React.CSSProperties = {
  flex: 1,
  height: 32,
  border: '1px solid #334155',
  borderRadius: 6,
  background: 'transparent',
  cursor: 'pointer',
  padding: 2,
};

const infoStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  paddingTop: 4,
};

const mobileBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: 'rgba(30, 41, 59, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalDialogStyle: React.CSSProperties = {
  width: 360,
  background: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(12px)',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 16px 64px rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  color: '#e2e8f0',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#f1f5f9',
  marginBottom: 8,
};

const dialogInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  marginTop: 8,
};

export default ControlPanel;
