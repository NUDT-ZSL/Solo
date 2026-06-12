import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SplitMode } from '../experiment/types';
import {
  COLOR_PRESETS,
  GREENERY_DENSITY_RANGE,
  LIGHT_ANGLE_RANGE,
  ANIMATION_PROGRESS_RANGE,
} from '../experiment/types';
import { updateStreetParams } from '../experiment/dataModule';

interface ControlPanelProps {
  currentStreetId: string;
  animationProgress: number;
  buildingColor: string;
  greeneryDensity: number;
  lightAngle: number;
  splitMode: SplitMode;
  onAnimationProgressChange: (value: number) => void;
  onBuildingColorChange: (color: string) => void;
  onGreeneryDensityChange: (value: number) => void;
  onLightAngleChange: (value: number) => void;
  onSplitModeChange: (mode: SplitMode) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentStreetId,
  animationProgress,
  buildingColor,
  greeneryDensity,
  lightAngle,
  splitMode,
  onAnimationProgressChange,
  onBuildingColorChange,
  onGreeneryDensityChange,
  onLightAngleChange,
  onSplitModeChange,
}) => {
  const [localProgress, setLocalProgress] = useState(animationProgress);
  const [localGreenery, setLocalGreenery] = useState(greeneryDensity);
  const [localLightAngle, setLocalLightAngle] = useState(lightAngle);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setLocalProgress(animationProgress);
  }, [animationProgress]);

  useEffect(() => {
    setLocalGreenery(greeneryDensity);
  }, [greeneryDensity]);

  useEffect(() => {
    setLocalLightAngle(lightAngle);
  }, [lightAngle]);

  const handleColorClick = useCallback(
    async (color: string) => {
      onBuildingColorChange(color);
      await updateStreetParams(currentStreetId, { buildingColor: color });
    },
    [currentStreetId, onBuildingColorChange]
  );

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setLocalProgress(value);
      onAnimationProgressChange(value);
    },
    [onAnimationProgressChange]
  );

  const handleGreeneryChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setLocalGreenery(value);
      onGreeneryDensityChange(value);
      await updateStreetParams(currentStreetId, { greeneryDensity: value });
    },
    [currentStreetId, onGreeneryDensityChange]
  );

  const handleLightAngleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setLocalLightAngle(value);
      onLightAngleChange(value);
      await updateStreetParams(currentStreetId, { lightAngle: value });
    },
    [currentStreetId, onLightAngleChange]
  );

  const handleSplitModeClick = useCallback(
    (mode: SplitMode) => {
      onSplitModeChange(mode);
    },
    [onSplitModeChange]
  );

  const splitModes: { value: SplitMode; label: string }[] = [
    { value: 'horizontal', label: '左右分屏' },
    { value: 'vertical', label: '上下分屏' },
    { value: 'overlay', label: '覆盖叠加' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px 40px',
        backgroundColor: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            改造动画时间轴
          </span>
          <span
            style={{
              color: '#4ADE80',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            改造进度：{Math.round(localProgress)}%
          </span>
        </div>
        <input
          type="range"
          min={ANIMATION_PROGRESS_RANGE.min}
          max={ANIMATION_PROGRESS_RANGE.max}
          step={ANIMATION_PROGRESS_RANGE.step}
          value={localProgress}
          onChange={handleProgressChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #4ADE80 0%, #22D3EE 100%)',
            appearance: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <div style={{ gridColumn: '1 / -1', justifySelf: 'center' }}>
          <span
            style={{
              display: 'block',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            建筑色调
          </span>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <AnimatePresence>
              {COLOR_PRESETS.map((preset) => (
                <motion.button
                  key={preset.value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleColorClick(preset.value)}
                  title={preset.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: buildingColor === preset.value ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                    backgroundColor: preset.value,
                    cursor: 'pointer',
                    boxShadow: buildingColor === preset.value
                      ? '0 0 20px rgba(255,255,255,0.5)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              绿化密度
            </span>
            <span
              style={{
                color: '#22D3EE',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {localGreenery}%
            </span>
          </div>
          <input
            type="range"
            min={GREENERY_DENSITY_RANGE.min}
            max={GREENERY_DENSITY_RANGE.max}
            step={GREENERY_DENSITY_RANGE.step}
            value={localGreenery}
            onChange={handleGreeneryChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #059669 0%, #34D399 50%, #6EE7B7 100%)',
              appearance: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              光照角度
            </span>
            <span
              style={{
                color: '#FBBF24',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {localLightAngle}°
            </span>
          </div>
          <input
            type="range"
            min={LIGHT_ANGLE_RANGE.min}
            max={LIGHT_ANGLE_RANGE.max}
            step={LIGHT_ANGLE_RANGE.step}
            value={localLightAngle}
            onChange={handleLightAngleChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #9333EA 0%, #F59E0B 50%, #3B82F6 100%)',
              appearance: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <span
            style={{
              display: 'block',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            分割模式
          </span>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {splitModes.map((mode) => (
              <motion.button
                key={mode.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSplitModeClick(mode.value)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: splitMode === mode.value
                    ? 'none'
                    : '2px solid rgba(255,255,255,0.3)',
                  backgroundColor: splitMode === mode.value ? 'white' : 'transparent',
                  color: splitMode === mode.value ? '#1a1a1a' : 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {mode.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
