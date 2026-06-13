import React, { useState, useEffect } from 'react';
import type { PlanetDataItem, MoonData } from '../data/PlanetData';
import { getPlanetById, PLANET_DATA } from '../data/PlanetData';

interface InfoPanelProps {
  selectedId: string | null;
  onClose: () => void;
}

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const InfoSection: React.FC<InfoSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
      >
        <span>{title}</span>
        <span
          style={{
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: '12px',
          }}
        >
          ▼
        </span>
      </button>
      <div
        style={{
          maxHeight: isOpen ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          opacity: isOpen ? 1 : 0,
          padding: isOpen ? '12px 4px 0 4px' : '0 4px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '13px',
    }}
  >
    <span style={{ color: '#64748b' }}>{label}</span>
    <span
      style={{
        color: '#1e293b',
        fontWeight: 500,
        fontFamily: 'monospace',
        textAlign: 'right',
        maxWidth: '60%',
      }}
    >
      {value}
    </span>
  </div>
);

const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    star: '恒星',
    planet: '行星',
    moon: '卫星',
  };
  return typeMap[type] || type;
};

const getParentPlanet = (moonId: string): string | null => {
  for (const planet of PLANET_DATA) {
    if (planet.moons) {
      for (const moon of planet.moons) {
        if (moon.id === moonId) {
          return planet.name;
        }
      }
    }
  }
  return null;
};

const InfoPanel: React.FC<InfoPanelProps> = ({ selectedId, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<PlanetDataItem | MoonData | null>(null);

  useEffect(() => {
    if (selectedId) {
      const planetData = getPlanetById(selectedId);
      setData(planetData || null);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setData(null), 300);
    }
  }, [selectedId]);

  if (!data) return null;

  const isMoon = 'type' in data && data.type === 'moon';
  const parentPlanet = isMoon ? getParentPlanet(data.id) : null;

  const colorCircleStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: `radial-gradient(circle at 30% 30%, ${data.color}, ${data.color}99 60%, ${data.color}55)`,
    boxShadow: `0 0 24px ${data.color}66`,
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0)',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'relative',
          width: '320px',
          maxWidth: '90vw',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '0 16px 16px 0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
          overflowX: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={colorCircleStyle} />
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '0.5px',
                }}
              >
                {data.name}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {data.nameEn}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.05)',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {getTypeLabel(isMoon ? 'moon' : (data as PlanetDataItem).type)}
            {parentPlanet && ` · 围绕 ${parentPlanet}`}
          </div>

          {'description' in data && (
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#475569',
                margin: '0 0 20px 0',
              }}
            >
              {data.description}
            </p>
          )}

          <InfoSection title="基本参数">
            <InfoRow label="类型" value={getTypeLabel(isMoon ? 'moon' : (data as PlanetDataItem).type)} />
            <InfoRow label="质量" value={data.mass} />
            <InfoRow label="直径" value={data.diameter} />
            <InfoRow label="表面温度" value={data.surfaceTemp} />
            {'distanceFromSun' in data && (
              <InfoRow label="距太阳距离" value={data.distanceFromSun} />
            )}
            {parentPlanet && <InfoRow label="母行星" value={parentPlanet} />}
          </InfoSection>

          {'orbitPeriod' in data && data.orbitPeriod > 0 && (
            <InfoSection title="轨道信息">
              <InfoRow
                label="公转周期"
                value={`${data.orbitPeriod.toFixed(1)} 年 (地球年)`}
              />
              {'orbitRadius' in data && (
                <InfoRow
                  label="轨道半径"
                  value={`${data.orbitRadius.toFixed(0)} 单位`}
                />
              )}
            </InfoSection>
          )}

          {'hasMoons' in data && data.hasMoons && 'moons' in data && data.moons && data.moons.length > 0 && (
            <InfoSection title={`卫星 (${data.moons.length})`}>
              {data.moons.map((moon) => (
                <div
                  key={moon.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: moon.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                      {moon.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{moon.nameEn}</div>
                  </div>
                </div>
              ))}
            </InfoSection>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) and (min-width: 768px) {
          div[style*="width: 320px"] {
            width: 240px !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="position: fixed"] {
            top: auto;
            bottom: 0;
            right: 0;
            height: auto;
          }
          div[style*="width: 320px"] {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 70vh;
            border-radius: 16px 16px 0 0 !important;
            transform: translateY(0) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InfoPanel;
