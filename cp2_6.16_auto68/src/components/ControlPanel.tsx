import React from 'react';
import { CongestionData } from '../App';

interface ControlPanelProps {
  trafficDensity: number;
  setTrafficDensity: (v: number) => void;
  speedThreshold: number;
  setSpeedThreshold: (v: number) => void;
  timeSpeed: number;
  setTimeSpeed: (v: number) => void;
  congestionData: CongestionData;
  onResetCamera: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  trafficDensity,
  setTrafficDensity,
  speedThreshold,
  setSpeedThreshold,
  timeSpeed,
  setTimeSpeed,
  congestionData,
  onResetCamera,
}) => {
  const getSeverityColor = (count: number): string => {
    if (count < 10) return '#00ff88';
    if (count <= 30) return '#ffaa00';
    return '#ff0044';
  };

  const avgSpeedColor = getSeverityColor(congestionData.severeCongestionCount);
  const congestionColor = getSeverityColor(congestionData.severeCongestionCount);

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .control-panel {
              width: 100% !important;
              height: 200px !important;
              right: 0 !important;
              top: auto !important;
              bottom: 0 !important;
              border-radius: 12px 12px 0 0 !important;
              display: flex !important;
              flex-direction: row !important;
              gap: 20px !important;
              padding: 15px !important;
            }
            .control-section {
              flex: 1;
              min-width: 0;
            }
            .status-section {
              flex: 1;
              min-width: 0;
              border-left: 1px solid #2d2d44;
              padding-left: 15px !important;
              margin-top: 0 !important;
            }
            .slider-row {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .slider-value {
              margin-top: 4px;
              margin-left: 0 !important;
            }
          }

          .custom-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 4px;
            background: #2d2d44;
            outline: none;
            transition: background 0.2s;
          }

          .custom-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #e94560;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 0 0 0 rgba(233, 69, 96, 0);
          }

          .custom-slider::-webkit-slider-thumb:hover {
            box-shadow: 0 0 15px 5px rgba(233, 69, 96, 0.5);
            transform: scale(1.1);
          }

          .custom-slider::-webkit-slider-thumb:active {
            transform: scale(0.95);
          }

          .custom-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #e94560;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            box-shadow: 0 0 0 0 rgba(233, 69, 96, 0);
          }

          .custom-slider::-moz-range-thumb:hover {
            box-shadow: 0 0 15px 5px rgba(233, 69, 96, 0.5);
            transform: scale(1.1);
          }

          .reset-btn {
            transition: all 0.2s ease;
          }

          .reset-btn:hover {
            background: #e94560 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
          }

          .reset-btn:active {
            transform: translateY(0);
          }
        `}
      </style>

      <div
        className="control-panel"
        style={{
          position: 'absolute',
          right: 20,
          top: 20,
          width: 280,
          padding: 20,
          borderRadius: 12,
          background: 'rgba(26, 26, 46, 0.85)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          color: '#e0e0e0',
          zIndex: 100,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: 18,
          fontWeight: 600,
          color: '#ffffff',
          borderBottom: '1px solid #2d2d44',
          paddingBottom: 12,
          letterSpacing: 0.5,
        }}>
          交通控制面板
        </h2>

        <div className="control-section">
          <div style={{ marginBottom: 20 }}>
            <div className="slider-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <label style={{ fontSize: 14, color: '#e0e0e0' }}>交通密度</label>
              <span
                className="slider-value"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginLeft: 12,
                  minWidth: 48,
                  textAlign: 'right',
                }}
              >
                {trafficDensity}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={trafficDensity}
              onChange={(e) => setTrafficDensity(Number(e.target.value))}
              className="custom-slider"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="slider-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <label style={{ fontSize: 14, color: '#e0e0e0' }}>速度阈值 (km/h)</label>
              <span
                className="slider-value"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginLeft: 12,
                  minWidth: 48,
                  textAlign: 'right',
                }}
              >
                {speedThreshold}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              value={speedThreshold}
              onChange={(e) => setSpeedThreshold(Number(e.target.value))}
              className="custom-slider"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="slider-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <label style={{ fontSize: 14, color: '#e0e0e0' }}>时间倍速</label>
              <span
                className="slider-value"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginLeft: 12,
                  minWidth: 48,
                  textAlign: 'right',
                }}
              >
                {timeSpeed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={timeSpeed * 10}
              onChange={(e) => setTimeSpeed(Number(e.target.value) / 10)}
              className="custom-slider"
            />
          </div>

          <button
            className="reset-btn"
            onClick={onResetCamera}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              background: '#2d2d44',
              color: '#ffffff',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            重置视角 (R)
          </button>
        </div>

        <div
          className="status-section"
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #2d2d44',
          }}
        >
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: 14,
            fontWeight: 600,
            color: '#a0a0b0',
            letterSpacing: 0.5,
          }}>
            实时状态
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#e0e0e0' }}>总车辆数</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
              }}>
                {congestionData.totalVehicles}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#e0e0e0' }}>平均车速</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: avgSpeedColor,
              }}>
                {congestionData.averageSpeed.toFixed(1)} km/h
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#e0e0e0' }}>严重拥堵路段</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: congestionColor,
              }}>
                {congestionData.severeCongestionCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ControlPanel;
