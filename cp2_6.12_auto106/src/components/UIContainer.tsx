import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  isRuins?: boolean;
  level?: number;
}

interface CityEngine {
  buildings: Building[];
  triggerEvent: (eventType: string, payload?: any) => void;
  destroyBuilding: (buildingId: string) => void;
  repairBuilding: (buildingId: string) => void;
  getTaxMultiplier: () => number;
  setTaxMultiplier: (multiplier: number, duration: number) => void;
}

interface GameStats {
  population: number;
  tax: number;
  satisfaction: number;
  energyConsumption: number;
  energyCapacity: number;
  safety: number;
  greenery: number;
  traffic: number;
}

interface SelectedCell {
  x: number;
  y: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface UIContainerProps {
  engine: CityEngine;
  onBuild: (x: number, y: number, type: string) => void;
  onUpgrade: (x: number, y: number) => void;
  onRepair: (x: number, y: number) => void;
  onTriggerEvent: (type: string) => void;
  stats: GameStats;
  timeOfDay: number;
  selectedCell: SelectedCell | null;
  onSelectCell: (x: number | null, y: number | null) => void;
}

const BUILDING_TYPES = [
  { id: 'residential', name: '住宅', icon: '🏠', color: '#3498db' },
  { id: 'commercial', name: '商业', icon: '🏪', color: '#f39c12' },
  { id: 'industrial', name: '工业', icon: '🏭', color: '#e74c3c' },
  { id: 'road', name: '道路', icon: '🛣️', color: '#95a5a6' },
];

const EVENTS = [
  { id: 'earthquake', name: '地震', icon: '🌊', color: '#e74c3c' },
  { id: 'celebration', name: '庆祝日', icon: '🎆', color: '#f39c12' },
  { id: 'prosperity', name: '经济繁荣', icon: '📈', color: '#2ecc71' },
];

const UIContainer: React.FC<UIContainerProps> = ({
  engine,
  onBuild,
  onUpgrade,
  onRepair,
  onTriggerEvent,
  stats,
  timeOfDay,
  selectedCell,
  onSelectCell,
}) => {
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [selectedBuildingType, setSelectedBuildingType] = useState<string | null>(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showSatisfactionDetail, setShowSatisfactionDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('stats');
  const [ripples, setRipples] = useState<Ripple[]>((
    []
  ));
  const rippleIdRef = useRef(0);
  const [showRoadUpgrade, setShowRoadUpgrade] = useState(false);
  const [selectedRoadCell, setSelectedRoadCell] = useState<SelectedCell | null>(null);
  const [energyOverload, setEnergyOverload] = useState(false);
  const [flickerBuildings, setFlickerBuildings] = useState<string[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const overload = stats.energyConsumption > stats.energyCapacity;
    setEnergyOverload(overload);
  }, [stats.energyConsumption, stats.energyCapacity]);

  useEffect(() => {
    if (!energyOverload) {
      setFlickerBuildings([]);
      return;
    }

    const interval = setInterval(() => {
      const buildings = engine.buildings.filter((b) => !b.isRuins);
      const count = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...buildings].sort(() => Math.random() - 0.5);
      const flickering = shuffled.slice(0, Math.min(count, buildings.length)).map((b) => b.id);
      setFlickerBuildings(flickering);
    }, 500);

    return () => clearInterval(interval);
  }, [energyOverload, engine.buildings]);

  const createRipple = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 400);
  }, []);

  const getSatisfactionColor = () => {
    if (stats.satisfaction >= 90) return '#2ecc71';
    if (stats.satisfaction >= 80) return '#f39c12';
    return '#e74c3c';
  };

  const getSatisfactionEmoji = () => {
    if (stats.satisfaction >= 90) return '😊';
    if (stats.satisfaction >= 80) return '😐';
    return '😟';
  };

  const getTimeGlowColor = () => {
    const t = timeOfDay % 1;
    if (t < 0.25) {
      const ratio = t / 0.25;
      return `rgba(255, ${Math.floor(255 * ratio)}, ${Math.floor(200 * ratio)}, 0.6)`;
    } else if (t < 0.5) {
      const ratio = (t - 0.25) / 0.25;
      return `rgba(255, 215, ${Math.floor(0 * ratio)}, 0.8)`;
    } else if (t < 0.75) {
      const ratio = (t - 0.5) / 0.25;
      return `rgba(${Math.floor(100 + 155 * ratio)}, ${Math.floor(215 - 115 * ratio)}, 255, 0.7)`;
    } else {
      const ratio = (t - 0.75) / 0.25;
      return `rgba(${Math.floor(255 - 155 * ratio)}, 100, 255, 0.5)`;
    }
  };

  const formatTime = () => {
    const hours = Math.floor(timeOfDay * 24) % 24;
    const minutes = Math.floor((timeOfDay * 24 * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (x: number, y: number) => {
    const building = engine.buildings.find(
      (b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height
    );

    if (building) {
      if (building.isRuins) {
        onRepair(building.x, building.y);
      } else if (building.type === 'road') {
        setSelectedRoadCell({ x: building.x, y: building.y });
        setShowRoadUpgrade(true);
      }
      onSelectCell(building.x, building.y);
    } else {
      onSelectCell(x, y);
      setSelectedBuildingType(null);
      setShowBuildMenu(true);
    }
  };

  const handleBuildingTypeSelect = (type: string) => {
    setSelectedBuildingType(type);
  };

  const handleConfirmBuild = () => {
    if (selectedCell && selectedBuildingType) {
      onBuild(selectedCell.x, selectedCell.y, selectedBuildingType);
      setShowBuildMenu(false);
      setSelectedBuildingType(null);
      onSelectCell(null, null);
    }
  };

  const handleUpgradeRoad = () => {
    if (selectedRoadCell) {
      onUpgrade(selectedRoadCell.x, selectedRoadCell.y);
      setShowRoadUpgrade(false);
      setSelectedRoadCell(null);
    }
  };

  const handleEventClick = (eventType: string) => {
    onTriggerEvent(eventType);
    setShowEventPanel(false);
  };

  const glassStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  const hoverButtonStyle: React.CSSProperties = {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  };

  const getEnergyPercentage = () => {
    return Math.min(100, Math.round((stats.energyConsumption / stats.energyCapacity) * 100));
  };

  const ruinBuildings = engine.buildings.filter((b) => b.isRuins);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 100,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <style>{`
        @keyframes ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 0.6;
          }
          100% {
            width: 80px;
            height: 80px;
            opacity: 0;
          }
        }
        @keyframes bounceUp {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.8);
          }
          60% {
            transform: translate(-50%, -10px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px currentColor; }
          50% { box-shadow: 0 0 40px currentColor; }
        }
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: ripple 0.4s ease-out forwards;
        }
        .hover-scale:hover {
          transform: scale(1.02) !important;
        }
        .flicker {
          animation: pulse 0.5s ease-in-out infinite;
        }
        .clock-hand {
          position: absolute;
          background: #00d4ff;
          transform-origin: bottom center;
          border-radius: 2px;
        }
      `}</style>

      {flickerBuildings.map((id) => {
        const building = engine.buildings.find((b) => b.id === id);
        if (!building) return null;
        return (
          <div
            key={`flicker-${id}`}
            className="flicker"
            style={{
              position: 'absolute',
              left: building.x,
              top: building.y,
              width: building.width,
              height: building.height,
              backgroundColor: 'rgba(255, 200, 0, 0.3)',
              border: '2px solid #f39c12',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          />
        );
      })}

      {ruinBuildings.map((building) => (
        <button
          key={`repair-${building.id}`}
          onClick={(e) => {
            createRipple(e);
            onRepair(building.x, building.y);
          }}
          style={{
            ...glassStyle,
            position: 'absolute',
            left: building.x + building.width / 2 - 30,
            top: building.y - 35,
            width: '60px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            color: '#3498db',
            fontSize: '12px',
            fontWeight: 'bold',
            pointerEvents: 'auto',
            zIndex: 200,
            ...hoverButtonStyle,
          }}
          className="hover-scale"
        >
          <span>🔧</span>
          <span>修复</span>
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>
      ))}

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            ...glassStyle,
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: `0 0 30px ${getTimeGlowColor()}`,
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '2px solid rgba(0, 212, 255, 0.5)',
              position: 'relative',
              background: 'radial-gradient(circle, rgba(0,50,80,0.8) 0%, rgba(0,20,40,0.9) 100%)',
            }}
          >
            <div
              className="clock-hand"
              style={{
                width: '2px',
                height: '15px',
                left: '50%',
                top: '10px',
                marginLeft: '-1px',
                transform: `rotate(${(timeOfDay % 1) * 360}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
            <div
              className="clock-hand"
              style={{
                width: '1.5px',
                height: '10px',
                left: '50%',
                top: '15px',
                marginLeft: '-0.75px',
                backgroundColor: 'rgba(0, 212, 255, 0.6)',
                transform: `rotate(${((timeOfDay * 12) % 1) * 360}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00d4ff',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-20px',
              color: '#00d4ff',
              fontSize: '11px',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0, 212, 255, 0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTime()}
          </div>
        </div>
      </div>

      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '240px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div
            style={{
              ...glassStyle,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👥</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>总人口</div>
                <div
                  style={{
                    color: '#ffd700',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                  }}
                >
                  {stats.population.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>税收</div>
                <div
                  style={{
                    color: '#ffd700',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  {stats.tax.toLocaleString()}
                </div>
              </div>
            </div>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setShowSatisfactionDetail(true)}
              onMouseLeave={() => setShowSatisfactionDetail(false)}
            >
              <span style={{ fontSize: '20px' }}>{getSatisfactionEmoji()}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>满意度</div>
                <div
                  style={{
                    color: getSatisfactionColor(),
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  {stats.satisfaction}%
                </div>
              </div>
              {showSatisfactionDetail && (
                <div
                  style={{
                    position: 'absolute',
                    right: 'calc(100% + 10px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    ...glassStyle,
                    padding: '12px',
                    width: '150px',
                    zIndex: 300,
                  }}
                >
                  <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                    详细因素
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                      <span>🛡️ 治安</span>
                      <span>{stats.safety}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                      <span>🌿 绿化</span>
                      <span>{stats.greenery}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                      <span>🚗 交通</span>
                      <span>{stats.traffic}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '20px' }}>🔋</span>
                {energyOverload && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      fontSize: '12px',
                      animation: 'pulse 1s infinite',
                    }}
                  >
                    ⚠️
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>能源消耗</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${getEnergyPercentage()}%`,
                        backgroundColor: energyOverload ? '#e74c3c' : '#3498db',
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                        boxShadow: energyOverload
                          ? '0 0 10px rgba(231, 76, 60, 0.5)'
                          : '0 0 10px rgba(52, 152, 219, 0.5)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: energyOverload ? '#e74c3c' : '#3498db',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      minWidth: '36px',
                      textAlign: 'right',
                    }}
                  >
                    {getEnergyPercentage()}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '70px' : '20px',
          left: '20px',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={(e) => {
            createRipple(e);
            setShowEventPanel(!showEventPanel);
          }}
          style={{
            ...glassStyle,
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            position: 'relative',
            overflow: 'hidden',
            ...hoverButtonStyle,
            boxShadow: '0 0 20px rgba(255, 200, 0, 0.3)',
          }}
          className="hover-scale"
        >
          ⚡
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>

        {showEventPanel && (
          <div
            style={{
              position: 'absolute',
              bottom: '70px',
              left: '0',
              width: '220px',
              ...glassStyle,
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <div
              style={{
                color: '#ffd700',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '4px',
                textAlign: 'center',
              }}
            >
              ⚡ 事件中心
            </div>
            {EVENTS.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                style={{
                  ...glassStyle,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  textAlign: 'left',
                  ...hoverButtonStyle,
                }}
                className="hover-scale"
              >
                <span style={{ fontSize: '18px' }}>{event.icon}</span>
                <span style={{ color: event.color, fontWeight: 'bold' }}>{event.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCell && showBuildMenu && (
        <div
          style={{
            position: 'absolute',
            left: selectedCell.x + 30,
            top: selectedCell.y - 20,
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 250,
            animation: 'bounceUp 0.2s ease-out',
          }}
        >
          <div
            style={{
              ...glassStyle,
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '160px',
            }}
          >
            <div
              style={{
                color: '#00d4ff',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '4px',
              }}
            >
              选择建筑类型
            </div>
            {BUILDING_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleBuildingTypeSelect(type.id)}
                style={{
                  ...glassStyle,
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: selectedBuildingType === type.id
                    ? `2px solid ${type.color}`
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: selectedBuildingType === type.id
                    ? `${type.color}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '13px',
                  ...hoverButtonStyle,
                }}
                className="hover-scale"
              >
                <span style={{ fontSize: '18px' }}>{type.icon}</span>
                <span style={{ color: type.color, fontWeight: 500 }}>{type.name}</span>
              </button>
            ))}
            {selectedBuildingType && (
              <button
                onClick={(e) => {
                  createRipple(e);
                  handleConfirmBuild();
                }}
                style={{
                  marginTop: '4px',
                  padding: '10px',
                  backgroundColor: '#00d4ff',
                  color: '#001',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  ...hoverButtonStyle,
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.5)',
                }}
                className="hover-scale"
              >
                ✔️ 确认建造
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    className="ripple"
                    style={{ left: ripple.x, top: ripple.y }}
                  />
                ))}
              </button>
            )}
          </div>
        </div>
      )}

      {selectedCell && selectedBuildingType && (
        <div
          style={{
            position: 'absolute',
            left: selectedCell.x,
            top: selectedCell.y,
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(52, 152, 219, 0.3)',
            border: '2px dashed rgba(52, 152, 219, 0.8)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 150,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {showRoadUpgrade && selectedRoadCell && (
        <div
          style={{
            position: 'absolute',
            left: selectedRoadCell.x + 30,
            top: selectedRoadCell.y - 10,
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 250,
            animation: 'bounceUp 0.2s ease-out',
          }}
        >
          <div
            style={{
              ...glassStyle,
              padding: '12px',
              width: '140px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#95a5a6', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
              🛣️ 道路升级
            </div>
            <button
              onClick={(e) => {
                createRipple(e);
                handleUpgradeRoad();
              }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#95a5a6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                ...hoverButtonStyle,
              }}
              className="hover-scale"
            >
              ⬆️ 升级道路
              {ripples.map((ripple) => (
                <span
                  key={ripple.id}
                  className="ripple"
                  style={{ left: ripple.x, top: ripple.y }}
                />
              ))}
            </button>
            <button
              onClick={() => {
                setShowRoadUpgrade(false);
                setSelectedRoadCell(null);
              }}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '6px',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: 'none',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            ...glassStyle,
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: 'none',
            display: 'flex',
            pointerEvents: 'auto',
            zIndex: 500,
          }}
        >
          <button
            onClick={() => setActiveNavTab('stats')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: 'transparent',
              border: 'none',
              color: activeNavTab === 'stats' ? '#00d4ff' : 'rgba(255,255,255,0.6)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '20px' }}>📊</span>
            <span>统计</span>
          </button>
          <button
            onClick={() => setActiveNavTab('build')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: 'transparent',
              border: 'none',
              color: activeNavTab === 'build' ? '#00d4ff' : 'rgba(255,255,255,0.6)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '20px' }}>🏗️</span>
            <span>建造</span>
          </button>
          <button
            onClick={() => setActiveNavTab('events')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: 'transparent',
              border: 'none',
              color: activeNavTab === 'events' ? '#00d4ff' : 'rgba(255,255,255,0.6)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span>事件</span>
          </button>
          <button
            onClick={() => setActiveNavTab('settings')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: 'transparent',
              border: 'none',
              color: activeNavTab === 'settings' ? '#00d4ff' : 'rgba(255,255,255,0.6)',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <span>设置</span>
          </button>
        </div>
      )}

      {isMobile && activeNavTab === 'stats' && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '10px',
            right: '10px',
            ...glassStyle,
            padding: '14px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.2s ease-out',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>👥</span>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>总人口</div>
                <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>
                  {stats.population.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>💰</span>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>税收</div>
                <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>
                  {stats.tax.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{getSatisfactionEmoji()}</span>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>满意度</div>
                <div style={{ color: getSatisfactionColor(), fontSize: '14px', fontWeight: 'bold' }}>
                  {stats.satisfaction}%
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔋</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>能源</div>
                <div style={{ color: energyOverload ? '#e74c3c' : '#3498db', fontSize: '14px', fontWeight: 'bold' }}>
                  {getEnergyPercentage()}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && activeNavTab === 'build' && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '10px',
            right: '10px',
            ...glassStyle,
            padding: '14px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.2s ease-out',
          }}
        >
          <div style={{ color: '#00d4ff', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
            🏗️ 建造菜单
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {BUILDING_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedBuildingType(type.id)}
                style={{
                  ...glassStyle,
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  border: selectedBuildingType === type.id
                    ? `2px solid ${type.color}`
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: selectedBuildingType === type.id
                    ? `${type.color}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '12px',
                  ...hoverButtonStyle,
                }}
                className="hover-scale"
              >
                <span style={{ fontSize: '24px' }}>{type.icon}</span>
                <span style={{ color: type.color }}>{type.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isMobile && activeNavTab === 'events' && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '10px',
            right: '10px',
            ...glassStyle,
            padding: '14px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.2s ease-out',
          }}
        >
          <div style={{ color: '#ffd700', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
            ⚡ 事件中心
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {EVENTS.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                style={{
                  ...glassStyle,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  textAlign: 'left',
                  ...hoverButtonStyle,
                }}
                className="hover-scale"
              >
                <span style={{ fontSize: '20px' }}>{event.icon}</span>
                <span style={{ color: event.color, fontWeight: 'bold' }}>{event.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UIContainer;
