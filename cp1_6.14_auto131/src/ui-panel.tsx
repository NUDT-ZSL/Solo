/* =========================================================
 * ui-panel.tsx —— React 控制面板组件
 * 职责：提供楼层选择下拉、视角切换按钮、实时数据面板，
 *       通过 EventBus 订阅数据更新，直接调用 SceneManager
 *       的公共方法进行场景交互。
 *
 * 调用关系：
 *   main.tsx           → <UIPanel sceneManager={...} />    传入实例
 *   UIPanel            → sceneManager.selectFloor()        楼层联动
 *   UIPanel            → sceneManager.setView()            视角切换
 *   EventBus           → on("data:update")                 订阅实时数据
 *   响应式：当屏幕宽度 < 768px 时，折叠为顶部横条布局
 * ========================================================= */

import React, { useEffect, useRef, useState } from 'react';
import { Building2, Eye, Zap, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import { BuildingData, EventBus, FloorData, ViewMode } from './event-bus';
import { SceneManager } from './scene-manager';

interface UIPanelProps {
  sceneManager: SceneManager;
  bus: EventBus;
}

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: 'overhead', label: '俯瞰' },
  { key: 'front', label: '正面' },
  { key: 'free', label: '自由' }
];

const ALERT_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
const ALERT_TEXT = ['正常', '注意', '警告', '严重'];

export const UIPanel: React.FC<UIPanelProps> = ({ sceneManager, bus }) => {
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [currentView, setCurrentView] = useState<ViewMode>('free');
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsub = bus.on('data:update', (d) => {
      setBuildingData(d);
    });
    return unsub;
  }, [bus]);

  useEffect(() => {
    const unsub1 = bus.on('floor:select', (f) => setSelectedFloor(f));
    const unsub2 = bus.on('view:change', (v) => setCurrentView(v));
    return () => {
      unsub1();
      unsub2();
    };
  }, [bus]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentFloorData: FloorData | undefined = buildingData?.floors.find(
    (f) => f.floor === selectedFloor
  );

  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
    sceneManager.selectFloor(floor);
    setDropdownOpen(false);
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    sceneManager.setView(view);
  };

  if (isMobile) {
    return (
      <div style={styles.mobilePanel}>
        <div style={styles.mobileLogo}>
          <Building2 size={22} color="#22d3ee" />
          <span style={styles.mobileTitle}>TwinTower</span>
        </div>

        <div style={styles.mobileControls}>
          <div ref={dropdownRef} style={styles.mobileDropdownWrap}>
            <button
              style={{ ...styles.mobileButton, ...styles.mobileDropdownBtn }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{selectedFloor}F</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {dropdownOpen && (
              <div style={styles.mobileDropdownMenu}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((f) => (
                  <div
                    key={f}
                    style={{
                      ...styles.mobileDropdownItem,
                      ...(selectedFloor === f ? { background: '#3b82f6', color: '#fff' } : {})
                    }}
                    onClick={() => handleFloorSelect(f)}
                  >
                    {f}F
                  </div>
                ))}
              </div>
            )}
          </div>

          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{
                ...styles.mobileButton,
                ...(currentView === opt.key ? styles.activeButton : {})
              }}
              onClick={() => handleViewChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}

          {currentFloorData && (
            <div style={styles.mobileData}>
              <Zap size={14} color="#22d3ee" />
              <span style={styles.mobileDataValue}>{currentFloorData.energy.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.headerIcon}>
          <Building2 size={22} color="#22d3ee" />
        </div>
        <div>
          <div style={styles.panelTitle}>TwinTower</div>
          <div style={styles.panelSubtitle}>智慧楼宇 3D 监控看板</div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionLabel}>
          <Eye size={14} color="#94a3b8" />
          <span>视角切换</span>
        </div>
        <div style={styles.viewButtons}>
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{
                ...styles.viewButton,
                ...(currentView === opt.key ? styles.activeButton : {})
              }}
              onClick={() => handleViewChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>
          <Building2 size={14} color="#94a3b8" />
          <span>楼层选择</span>
        </div>
        <div ref={dropdownRef} style={styles.dropdownWrap}>
          <button
            style={styles.dropdownBtn}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>第 {selectedFloor} 层</span>
            <ChevronDown
              size={16}
              style={{
                transition: 'transform 0.2s',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none'
              }}
            />
          </button>
          {dropdownOpen && (
            <div style={styles.dropdownMenu}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((f) => {
                const fd = buildingData?.floors.find((x) => x.floor === f);
                const alertColor = fd ? ALERT_COLORS[fd.alertLevel] : '#22c55e';
                return (
                  <div
                    key={f}
                    style={{
                      ...styles.dropdownItem,
                      ...(selectedFloor === f ? { background: '#3b82f6', color: '#fff' } : {})
                    }}
                    onClick={() => handleFloorSelect(f)}
                  >
                    <span>{f}F</span>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: alertColor,
                        boxShadow: `0 0 6px ${alertColor}`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionLabel}>
          <Zap size={14} color="#94a3b8" />
          <span>实时数据 · {selectedFloor}F</span>
        </div>

        {currentFloorData ? (
          <div style={styles.dataGrid}>
            <div style={styles.dataCard}>
              <div style={styles.dataCardIcon}>
                <Zap size={18} color="#22d3ee" />
              </div>
              <div>
                <div style={styles.dataCardLabel}>能耗</div>
                <div style={styles.dataCardValue}>
                  <span style={styles.dataValue}>{currentFloorData.energy.toFixed(1)}</span>
                  <span style={styles.dataUnit}> kW</span>
                </div>
              </div>
            </div>

            <div style={styles.dataCard}>
              <div style={{ ...styles.dataCardIcon, background: 'rgba(59, 130, 246, 0.15)' }}>
                <Users size={18} color="#3b82f6" />
              </div>
              <div>
                <div style={styles.dataCardLabel}>人流量</div>
                <div style={styles.dataCardValue}>
                  <span style={styles.dataValue}>{currentFloorData.people}</span>
                  <span style={styles.dataUnit}> 人</span>
                </div>
              </div>
            </div>

            <div style={{ ...styles.dataCard, gridColumn: '1 / -1' }}>
              <div
                style={{
                  ...styles.dataCardIcon,
                  background: `${ALERT_COLORS[currentFloorData.alertLevel]}20`
                }}
              >
                <AlertTriangle size={18} color={ALERT_COLORS[currentFloorData.alertLevel]} />
              </div>
              <div>
                <div style={styles.dataCardLabel}>告警状态</div>
                <div style={styles.dataCardValue}>
                  <span
                    style={{
                      ...styles.dataValue,
                      color: ALERT_COLORS[currentFloorData.alertLevel]
                    }}
                  >
                    {ALERT_TEXT[currentFloorData.alertLevel]}
                  </span>
                  <span style={styles.dataUnit}> · Lv.{currentFloorData.alertLevel}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.loadingText}>加载数据中...</div>
        )}
      </div>

      <div style={styles.footer}>
        <span style={styles.footerDot} />
        <span style={styles.footerText}>实时数据 · 每 2 秒刷新</span>
      </div>
    </div>
  );
};

/* ========== 样式 ========== */
const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    left: 20,
    top: 20,
    width: 240,
    background: 'rgba(30, 41, 59, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    padding: 16,
    color: '#ffffff',
    fontFamily: '"Microsoft YaHei", sans-serif',
    zIndex: 1000,
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    overflowX: 'hidden'
  },

  mobilePanel: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '100%',
    height: 60,
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: 'none',
    borderRadius: 0,
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    padding: '0 12px',
    color: '#ffffff',
    fontFamily: '"Microsoft YaHei", sans-serif',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },

  mobileLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },

  mobileTitle: {
    fontSize: 15,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },

  mobileControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end'
  },

  mobileDropdownWrap: {
    position: 'relative'
  },

  mobileDropdownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },

  mobileDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: 'rgba(30, 41, 59, 0.98)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    padding: 4,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 2,
    minWidth: 200,
    zIndex: 1001
  },

  mobileDropdownItem: {
    padding: '8px 0',
    textAlign: 'center',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: '#e2e8f0'
  },

  mobileButton: {
    background: 'rgba(148, 163, 184, 0.15)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#e2e8f0',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    justifyContent: 'center'
  },

  mobileData: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    background: 'rgba(34, 211, 238, 0.1)',
    border: '1px solid rgba(34, 211, 238, 0.3)',
    borderRadius: 6,
    minWidth: 44,
    justifyContent: 'center'
  },

  mobileDataValue: {
    color: '#22d3ee',
    fontWeight: 700,
    fontSize: 12,
    fontFamily: 'monospace'
  },

  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(59, 130, 246, 0.15))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(34, 211, 238, 0.2)'
  },

  panelTitle: {
    fontSize: 16,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1.2
  },

  panelSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },

  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent)',
    margin: '14px 0'
  },

  section: {
    marginBottom: 14
  },

  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    fontWeight: 500
  },

  viewButtons: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },

  viewButton: {
    width: 100,
    height: 36,
    background: 'rgba(148, 163, 184, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },

  activeButton: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#ffffff',
    boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)'
  },

  dropdownWrap: {
    position: 'relative'
  },

  dropdownBtn: {
    width: '100%',
    height: 40,
    background: 'rgba(148, 163, 184, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px'
  },

  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'rgba(30, 41, 59, 0.98)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    padding: 4,
    zIndex: 1001,
    maxHeight: 260,
    overflowY: 'auto'
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: '#e2e8f0'
  },

  dataGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },

  dataCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'all 0.2s ease'
  },

  dataCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(34, 211, 238, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },

  dataCardLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2
  },

  dataCardValue: {
    display: 'flex',
    alignItems: 'baseline'
  },

  dataValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#22d3ee',
    fontFamily: 'monospace',
    letterSpacing: -0.5
  },

  dataUnit: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 2
  },

  loadingText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    padding: 20
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: '#64748b',
    paddingTop: 12,
    borderTop: '1px solid rgba(148, 163, 184, 0.1)'
  },

  footerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
    animation: 'pulse 2s infinite'
  },

  footerText: {
    fontSize: 11
  }
};
