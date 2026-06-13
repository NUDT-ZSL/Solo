import React from 'react';
import type { CelestialBody } from '../../physics/GravityEngine';

interface GravityVector {
  body: CelestialBody;
  fx: number;
  fy: number;
  mag: number;
}

interface InfoPanelProps {
  gravityVectors: GravityVector[];
}

export default function InfoPanel({ gravityVectors }: InfoPanelProps) {
  const panelHeight = 60 + gravityVectors.length * 28;

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        left: 12,
        width: 240,
        height: panelHeight,
        background: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 12,
        padding: '12px 16px',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          color: '#94a3b8',
          fontSize: 12,
          fontFamily: 'sans-serif',
          marginBottom: 12,
        }}
      >
        引力数据
      </div>
      {gravityVectors.map((gv, i) => {
        const angle = Math.atan2(gv.fy, gv.fx);
        const arrowLen = Math.min(gv.mag * 30, 40);
        return (
          <div
            key={gv.body.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 28,
              gap: 8,
            }}
          >
            <span
              style={{
                color: '#cbd5e1',
                fontSize: 11,
                fontFamily: 'sans-serif',
                width: 70,
              }}
            >
              {gv.body.type === 'planet' ? '行星' : '小行星'} {gv.body.id.replace(/\D/g, '')}
            </span>
            <span
              style={{
                color: '#64748b',
                fontSize: 11,
                fontFamily: 'sans-serif',
                width: 60,
              }}
            >
              引力: {gv.mag.toFixed(1)}
            </span>
            <div
              style={{
                position: 'relative',
                width: 60,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={60} height={16} viewBox="0 0 60 16">
                <line
                  x1={30}
                  y1={8}
                  x2={30 + Math.cos(angle) * arrowLen}
                  y2={8 + Math.sin(angle) * arrowLen}
                  stroke="#38bdf8"
                  strokeWidth={2}
                />
                <polygon
                  points={`
                    ${30 + Math.cos(angle) * arrowLen},${8 + Math.sin(angle) * arrowLen}
                    ${30 + Math.cos(angle) * arrowLen - 6 * Math.cos(angle - 0.5)},${8 + Math.sin(angle) * arrowLen - 6 * Math.sin(angle - 0.5)}
                    ${30 + Math.cos(angle) * arrowLen - 6 * Math.cos(angle + 0.5)},${8 + Math.sin(angle) * arrowLen - 6 * Math.sin(angle + 0.5)}
                  `}
                  fill="#38bdf8"
                />
              </svg>
            </div>
          </div>
        );
      })}
      {gravityVectors.length === 0 && (
        <div
          style={{
            color: '#64748b',
            fontSize: 11,
            fontFamily: 'sans-serif',
            marginTop: 4,
          }}
        >
          发射探测器后显示引力数据
        </div>
      )}
    </div>
  );
}
