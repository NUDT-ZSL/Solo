import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isRuins?: boolean;
}

interface ParticleConfig {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  color: string;
  size: number;
  life: number;
  gravity?: number;
}

interface CityEngine {
  buildings: Building[];
  triggerEvent: (eventType: string, payload?: any) => void;
  destroyBuilding: (buildingId: string) => void;
  repairBuilding: (buildingId: string) => void;
  getTaxMultiplier: () => number;
  setTaxMultiplier: (multiplier: number, duration: number) => void;
}

interface Renderer {
  addParticles: (particles: ParticleConfig[]) => void;
  shakeScreen: (duration: number, intensity: number) => void;
}

interface EventItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  color: string;
}

interface EventLogPayload {
  eventType: string;
  eventName: string;
  timestamp: number;
  details?: any;
}

interface EventManagerProps {
  engine: CityEngine;
  renderer: Renderer;
  isOpen: boolean;
  onClose: () => void;
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

const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1'];

const EventManager: React.FC<EventManagerProps> = ({ engine, renderer, isOpen, onClose }) => {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [confirmEvent, setConfirmEvent] = useState<EventItem | null>(null);
  const [ruinBuildings, setRuinBuildings] = useState<string[]>([]);
  const [isProsperityActive, setIsProsperityActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);

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

  const logEvent = useCallback(async (payload: EventLogPayload) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }, []);

  const triggerEarthquake = useCallback(() => {
    setIsShaking(true);
    renderer.shakeScreen(300, 5);

    setTimeout(() => setIsShaking(false), 300);

    const buildings = engine.buildings.filter((b) => !b.isRuins);
    const count = Math.floor(Math.random() * 4) + 5;
    const shuffled = [...buildings].sort(() => Math.random() - 0.5);
    const destroyed = shuffled.slice(0, Math.min(count, buildings.length));

    const destroyedIds: string[] = [];
    destroyed.forEach((building) => {
      engine.destroyBuilding(building.id);
      destroyedIds.push(building.id);
    });

    setRuinBuildings((prev) => [...prev, ...destroyedIds]);

    engine.triggerEvent('earthquake', { destroyedCount: destroyed.length });

    logEvent({
      eventType: 'earthquake',
      eventName: '地震',
      timestamp: Date.now(),
      details: { destroyedCount: destroyed.length, buildingIds: destroyedIds },
    });
  }, [engine, renderer, logEvent]);

  const triggerCelebration = useCallback(() => {
    const buildings = engine.buildings;
    const duration = 3000;
    const startTime = Date.now();

    const launchFirework = () => {
      if (Date.now() - startTime > duration) return;

      buildings.forEach((building) => {
        const particles: ParticleConfig[] = [];
        const baseX = building.x + building.width / 2;
        const baseY = building.y;

        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 6) * (i / 10) + Math.PI / 3;
          const speed = 3 + Math.random() * 2;
          particles.push({
            x: baseX,
            y: baseY,
            vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
            vy: -Math.sin(angle) * speed - 2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 3 + Math.random() * 2,
            life: 60,
            gravity: 0.05,
          });
        }

        renderer.addParticles(particles);
      });

      if (Date.now() - startTime < duration) {
        setTimeout(launchFirework, 300);
      }
    };

    launchFirework();

    engine.triggerEvent('celebration', { duration });

    logEvent({
      eventType: 'celebration',
      eventName: '庆祝日',
      timestamp: Date.now(),
      details: { duration },
    });
  }, [engine, renderer, logEvent]);

  const triggerProsperity = useCallback(() => {
    const duration = 30000;
    engine.setTaxMultiplier(2, duration);
    setIsProsperityActive(true);

    setTimeout(() => {
      setIsProsperityActive(false);
    }, duration);

    engine.triggerEvent('prosperity', { duration, multiplier: 2 });

    logEvent({
      eventType: 'prosperity',
      eventName: '经济繁荣',
      timestamp: Date.now(),
      details: { duration, multiplier: 2 },
    });
  }, [engine, logEvent]);

  const handleRepair = useCallback(
    (buildingId: string) => {
      engine.repairBuilding(buildingId);
      setRuinBuildings((prev) => prev.filter((id) => id !== buildingId));
    },
    [engine]
  );

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '24px',
    width: '480px',
    maxWidth: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const titleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s',
  };

  const eventListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const eventItemStyle = (event: EventItem, onCooldown: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    cursor: onCooldown ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    border: `2px solid transparent`,
    opacity: onCooldown ? 0.5 : 1,
  });

  const iconStyle: React.CSSProperties = {
    fontSize: '32px',
    marginRight: '16px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
  };

  const eventInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const eventNameStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  };

  const eventDescStyle: React.CSSProperties = {
    color: '#888',
    fontSize: '13px',
  };

  const cooldownStyle: React.CSSProperties = {
    color: '#f39c12',
    fontSize: '12px',
    marginTop: '4px',
  };

  const confirmOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  };

  const confirmModalStyle: React.CSSProperties = {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '28px',
    width: '360px',
    maxWidth: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const confirmIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: '12px',
  };

  const confirmTitleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  };

  const confirmDescStyle: React.CSSProperties = {
    color: '#888',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: 1.5,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
  };

  const cancelBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const confirmBtnStyle = (color: string): React.CSSProperties => ({
    flex: 1,
    padding: '12px',
    backgroundColor: color,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  });

  const prosperityBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#2ecc71',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(46, 204, 113, 0.4)',
    animation: 'pulse 2s infinite',
  };

  const repairButtonStyle = (building: Building): React.CSSProperties => ({
    position: 'absolute',
    left: building.x + building.width / 2 - 30,
    top: building.y - 30,
    width: '60px',
    padding: '6px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(52, 152, 219, 0.4)',
  });

  const shakeStyle: React.CSSProperties = isShaking
    ? {
        animation: 'shake 0.3s ease-in-out',
      }
    : {};

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .event-item:hover {
          border-color: rgba(255, 255, 255, 0.2) !important;
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .close-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .cancel-btn:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
        .confirm-btn:hover {
          filter: brightness(1.1);
        }
        .repair-btn:hover {
          filter: brightness(1.1);
        }
      `}</style>

      {isProsperityActive && (
        <div style={prosperityBadgeStyle}>
          <span>📈</span>
          <span>经济繁荣 x2</span>
        </div>
      )}

      {ruinBuildings.map((id) => {
        const building = engine.buildings.find((b) => b.id === id);
        if (!building) return null;
        return (
          <button
            key={`repair-${id}`}
            style={repairButtonStyle(building)}
            className="repair-btn"
            onClick={() => handleRepair(id)}
          >
            🔧 修复
          </button>
        );
      })}

      <div style={{ ...overlayStyle, ...shakeStyle }} onClick={onClose}>
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
                  onClick={() => handleEventClick(event)}
                >
                  <div style={{ ...iconStyle, backgroundColor: `${event.color}20` }}>
                    {event.icon}
                  </div>
                  <div style={eventInfoStyle}>
                    <div style={{ ...eventNameStyle, color: event.color }}>
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
            <div style={{ ...confirmTitleStyle, color: confirmEvent.color }}>
              {confirmEvent.name}
            </div>
            <div style={confirmDescStyle}>{confirmEvent.description}</div>
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
