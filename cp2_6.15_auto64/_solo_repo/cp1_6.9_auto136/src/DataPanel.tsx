import React, { useEffect, useState } from 'react';
import { SimParams, CircuitState } from './types';

interface DataPanelProps {
  simParams: SimParams;
}

export default function DataPanel({ simParams }: DataPanelProps) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (simParams.status === CircuitState.Open) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 300);
      return () => clearTimeout(t);
    }
  }, [simParams.status]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 280,
        background: 'rgba(45,45,68,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: 18,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        fontFamily: 'monospace',
        zIndex: 10,
      }}
    >
      <div
        style={{
          color: '#E0E0F0',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 14,
          letterSpacing: 0.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 10,
        }}
      >
        电路状态监测
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row label="电压 (V)" value={simParams.voltage.toFixed(1)} />
        <Row label="电流 (mA)" value={simParams.current.toFixed(2)} />
        <Row label="功率 (mW)" value={simParams.power.toFixed(2)} />

        <div style={{ marginTop: 6 }}>
          <div style={{ color: '#A0A0B0', fontSize: 12, marginBottom: 4 }}>电路状态</div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 6,
              background:
                simParams.status === CircuitState.Closed
                  ? 'rgba(0,255,136,0.12)'
                  : 'rgba(255,68,68,0.15)',
              transform: shake ? 'translateX(0)' : undefined,
              animation: shake ? 'shake 0.3s ease-in-out' : undefined,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: simParams.status === CircuitState.Closed ? '#00FF88' : '#FF4444',
                animation:
                  simParams.status === CircuitState.Open ? 'blink 1s infinite' : undefined,
                boxShadow:
                  simParams.status === CircuitState.Closed
                    ? '0 0 8px #00FF88'
                    : '0 0 8px #FF4444',
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: simParams.status === CircuitState.Closed ? '#00FF88' : '#FF6B6B',
                animation:
                  simParams.status === CircuitState.Open ? 'blinkText 1s infinite' : undefined,
              }}
            >
              {simParams.status === CircuitState.Closed ? '闭合' : '断路'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes blinkText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: '#A0A0B0', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#00FF88', fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>
        {value}
      </span>
    </div>
  );
}
