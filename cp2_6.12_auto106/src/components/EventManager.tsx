import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BuildingType, EventType } from '../engine/types';

interface CityEngine {
  getGrid: () => any[][];
  getRuinBuildings: () => any[];
  triggerEvent: (type: EventType) => void;
  repairBuilding: (x: number, y: number) => boolean;
  setTaxMultiplier: (multiplier: number, duration: number) => void;
  getTaxMultiplier: () => number;
  getBuildingAt: (x: number, y: number) => any;
}

interface Renderer {
  addParticles: (x: number, y: number, type: 'build' | 'firework', count: number) => void;
  shakeScreen: (duration: number, intensity: number) => void;
}

interface EventManagerProps {
  engine: CityEngine;
  renderer: Renderer;
  isOpen: boolean;
  onClose: () => void;
}

interface EventItem {
  id: EventType;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  color: string;
}

const EVENTS: EventItem[] = [
  {
    id: 'earthquake',
    name: '地震',
    icon: '🌊',
    description: '随机摧毁5-8栋建筑',
    cooldown: 60000,
    color: '#e74c3c',
  },
  {
    id: 'celebration',
    name: '庆祝日',
    icon: '🎆',
    description: '全城燃放礼花3秒',
    cooldown: 30000,
    color: '#f39c12',
  },
  {
    id: 'prosperity',
    name: '经济繁荣',
    icon: '📈',
    description: '税收翻倍持续30秒',
    cooldown: 120000,
    color: '#2ecc71',
  },
];

const EventManager: React.FC<EventManagerProps> = ({ engine, renderer, isOpen, onClose }) => {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [confirmEvent, setConfirmEvent] = useState<EventItem | null>(null);
  const [isProsperityActive, setIsProsperityActive] = useState(false);
  const celebrationTimerRef = useRef<number | null>(null);
  const prosperityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCooldowns((prev) => {
        const next = { ...prev };
        let hasChanges = false;
        for (const key of Object.keys(next)) {
          if (next[key] <= now) {
            delete next[key];
            hasChanges = true;
          }
        }
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
      if (prosperityTimerRef.current) {
        clearTimeout(prosperityTimerRef.current);
      }
    };
  }, []);

  const logEvent = useCallback(async (eventType: string, eventName: string, details: any) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveId: 'default',
          eventType,
          eventData: { name: eventName, timestamp: Date.now(), details }
        })
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }, []);

  const triggerEarthquake = useCallback(() => {
    renderer.shakeScreen(300, 5);
    engine.triggerEvent('earthquake');
    
    const ruins = engine.getRuinBuildings();
    logEvent('earthquake', '地震', { 
      destroyedCount: ruins.length, 
      buildings: ruins.map((b: any) => ({ x: b.x, y: b.y }))
    });
  }, [engine, renderer, logEvent]);

  const triggerCelebration = useCallback(() => {
    const grid = engine.getGrid();
    const duration = 3000;
    const startTime = Date.now();

    const launchFirework = () => {
      if (Date.now() - startTime > duration) return;

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const building = grid[y][x];
          if (building && building.type !== 'empty') {
            renderer.addParticles(x, y, 'firework', 10);
          }
        }
      }

      if (Date.now() - startTime < duration) {
        celebrationTimerRef.current = window.setTimeout(launchFirework, 300);
      }
    };

    launchFirework();
    engine.triggerEvent('celebration');
    logEvent('celebration', '庆祝日', { duration });
  }, [engine, renderer, logEvent]);

  const triggerProsperity = useCallback(() => {
    const duration = 30000;
    engine.setTaxMultiplier(2, duration);
    setIsProsperityActive(true);

    if (prosperityTimerRef.current) {
      clearTimeout(prosperityTimerRef.current);
    }
    prosperityTimerRef.current = window.setTimeout(() => {
      setIsProsperityActive(false);
    }, duration);

    engine.triggerEvent('prosperity');
    logEvent('prosperity', '经济繁荣', { duration, multiplier: 2 });
  }, [engine, logEvent]);

  const handleEventClick = useCallback((event: EventItem) => {
    const now = Date.now();
    if (cooldowns[event.id] && cooldowns[event.id] > now) {
      return;
    }
    setConfirmEvent(event);
  }, [cooldowns]);

  const handleConfirm = useCallback(() => {
    if (!confirmEvent) return;

    switch (confirmEvent.id) {
      case 'earthquake':
        triggerEarthquake();
        break;
      case 'celebration':
        triggerCelebration();
        break;
      case 'prosperity':
        triggerProsperity();
        break;
    }

    setCooldowns((prev) => ({
      ...prev,
      [confirmEvent.id]: Date.now() + confirmEvent.cooldown,
    }));

    setConfirmEvent(null);
    onClose();
  }, [confirmEvent, triggerEarthquake, triggerCelebration, triggerProsperity, onClose]);

  const handleCancel = useCallback(() => {
    setConfirmEvent(null);
  }, []);

  const formatCooldown = useCallback((endTime: number) => {
    const remaining = Math.max(0, endTime - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}分${secs}秒`;
    }
    return `${seconds}秒`;
  }, []);

  const isEventOnCooldown = useCallback(
    (eventId: string) => {
      const now = Date.now();
      return cooldowns[eventId] && cooldowns[eventId] > now;
    },
    [cooldowns]
  );

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  };

  const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 15, 30, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '28px',
    width: '500px',
    maxWidth: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    animation: 'slideUp 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
  };

  const titleStyle: React.CSSProperties = {
    color: '#00ffff',
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
    letterSpacing: '2px',
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '10px',
    transition: 'all 0.2s',
  };

  const eventListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  };

  const eventItemStyle = (event: EventItem, onCooldown: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '18px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
    borderRadius: '14px',
    cursor: onCooldown ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    border: `2px solid ${onCooldown ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}`,
    opacity: onCooldown ? 0.5 : 1,
  });

  const iconStyle = (color: string): React.CSSProperties => ({
    fontSize: '36px',
    marginRight: '18px',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
    borderRadius: '14px',
    boxShadow: `0 0 20px ${color}20`,
  });

  const eventInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const eventNameStyle = (color: string): React.CSSProperties => ({
    color: color,
    fontSize: '17px',
    fontWeight: 600,
    marginBottom: '6px',
    textShadow: `0 0 8px ${color}40`,
  });

  const eventDescStyle: React.CSSProperties = {
    color: '#aaa',
    fontSize: '13px',
  };

  const cooldownStyle: React.CSSProperties = {
    color: '#ff9500',
    fontSize: '12px',
    marginTop: '6px',
    fontWeight: 500,
  };

  const confirmOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  };

  const confirmModalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(15, 15, 30, 1) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '32px',
    width: '380px',
    maxWidth: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 0, 255, 0.1)',
    border: '1px solid rgba(255, 0, 255, 0.2)',
    animation: 'pulseIn 0.3s ease-out',
  };

  const confirmIconStyle: React.CSSProperties = {
    fontSize: '56px',
    marginBottom: '16px',
    animation: 'bounce 1s infinite',
  };

  const confirmTitleStyle = (color: string): React.CSSProperties => ({
    color: color,
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '10px',
    textShadow: `0 0 12px ${color}60`,
  });

  const confirmDescStyle: React.CSSProperties = {
    color: '#bbb',
    fontSize: '14px',
    marginBottom: '24px',
    lineHeight: 1.6,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '14px',
  };

  const cancelBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  };

  const confirmBtnStyle = (color: string): React.CSSProperties => ({
    flex: 1,
    padding: '14px',
    background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
    boxShadow: `0 4px 15px ${color}60`,
  });

  const prosperityBadgeStyle: React.CSSProperties = {
    position: 'fixed',
    top: '24px',
    right: '24px',
    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 20px rgba(46, 204, 113, 0.5)',
    animation: 'glow 2s infinite',
    zIndex: 1200,
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(46, 204, 113, 0.5); }
          50% { box-shadow: 0 4px 30px rgba(46, 204, 113, 0.8); }
        }
        .event-item:hover:not([data-disabled="true"]) {
          border-color: rgba(0, 255, 255, 0.4) !important;
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(0, 255, 255, 0.02) 100%) !important;
          transform: translateX(4px);
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .cancel-btn:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%) !important;
          border-color: rgba(255, 255, 255, 0.4);
        }
        .confirm-btn:hover {
          filter: brightness(1.15);
          transform: translateY(-2px);
        }
      `}</style>

      {isProsperityActive && (
        <div style={prosperityBadgeStyle}>
          <span>📈</span>
          <span>经济繁荣 x2</span>
        </div>
      )}

      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>⚡ 事件中心</h2>
            <button
              style={closeBtnStyle}
              className="close-btn"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div style={eventListStyle}>
            {EVENTS.map((event) => {
              const onCooldown = isEventOnCooldown(event.id);
              return (
                <div
                  key={event.id}
                  className="event-item"
                  style={eventItemStyle(event, onCooldown)}
                  data-disabled={onCooldown}
                  onClick={() => handleEventClick(event)}
                >
                  <div style={iconStyle(event.color)}>
                    {event.icon}
                  </div>
                  <div style={eventInfoStyle}>
                    <div style={eventNameStyle(event.color)}>
                      {event.name}
                    </div>
                    <div style={eventDescStyle}>{event.description}</div>
                    {onCooldown && (
                      <div style={cooldownStyle}>
                        ⏳ 冷却中: {formatCooldown(cooldowns[event.id])}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {confirmEvent && (
        <div style={confirmOverlayStyle} onClick={handleCancel}>
          <div style={confirmModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={confirmIconStyle}>{confirmEvent.icon}</div>
            <div style={confirmTitleStyle(confirmEvent.color)}>
              {confirmEvent.name}
            </div>
            <div style={confirmDescStyle}>
              确定要触发「{confirmEvent.name}」事件吗？<br/>
              {confirmEvent.description}
            </div>
            <div style={buttonContainerStyle}>
              <button
                style={cancelBtnStyle}
                className="cancel-btn"
                onClick={handleCancel}
              >
                取消
              </button>
              <button
                style={confirmBtnStyle(confirmEvent.color)}
                className="confirm-btn"
                onClick={handleConfirm}
              >
                确认触发
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventManager;
