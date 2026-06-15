import { useState, useCallback, useRef } from 'react';
import { usePlantStore } from './store';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const RippleButton = ({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { id, x, y }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 400);
      }
      onClick?.(e);
    },
    [onClick]
  );

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-lg transition-all duration-200 active:scale-95 ${className}`}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none rounded-full bg-white"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.4s ease-out forwards',
          }}
        />
      ))}
      {children}
    </button>
  );
};

const RippleSlider = ({
  value,
  min,
  max,
  step,
  onChange,
  label,
  unit = '',
  showValue = true,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  showValue?: boolean;
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = rect.height / 2;
        const id = Date.now();

        setRipples((prev) => [...prev, { id, x, y }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 400);
      }
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        {showValue && (
          <span className="text-xs font-mono text-cyan-400">
            {value.toFixed(step < 1 ? 2 : 0)}
            {unit}
          </span>
        )}
      </div>
      <div
        ref={trackRef}
        className="relative h-2 rounded-lg bg-gray-700 overflow-visible"
        onMouseDown={handleMouseDown}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute pointer-events-none rounded-full bg-cyan-400"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 0.4s ease-out forwards',
            }}
          />
        ))}
        <div
          className="absolute h-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-cyan-500/50 transition-all duration-100 z-20 pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};

const StepperControl = ({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) => {
  const handleDecrement = useCallback(() => {
    if (value > min) {
      onChange(value - 1);
    }
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      onChange(value + 1);
    }
  }, [value, max, onChange]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span className="text-xs font-mono text-cyan-400">
          {value} / {max}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <RippleButton
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold text-lg"
        >
          −
        </RippleButton>
        <div className="flex-1 h-2 rounded-lg bg-gray-700 relative overflow-hidden">
          <div
            className="absolute h-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-200"
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
            }}
          />
        </div>
        <RippleButton
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold text-lg"
        >
          +
        </RippleButton>
      </div>
    </div>
  );
};

const ColorPreview = ({
  color,
  label,
}: {
  color: string;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <div
      className="w-5 h-5 rounded-full border-2 border-gray-600 shadow-inner"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

export const ControlPanel = () => {
  const branchAngle = usePlantStore((state) => state.branchAngle);
  const recursionDepth = usePlantStore((state) => state.recursionDepth);
  const randomStrength = usePlantStore((state) => state.randomStrength);
  const branchCount = usePlantStore((state) => state.branchCount);
  const trunkColorBottom = usePlantStore((state) => state.trunkColorBottom);
  const trunkColorTop = usePlantStore((state) => state.trunkColorTop);
  const leafColor = usePlantStore((state) => state.leafColor);
  const isGrowing = usePlantStore((state) => state.isGrowing);
  const isPruning = usePlantStore((state) => state.isPruning);

  const setBranchAngle = usePlantStore((state) => state.setBranchAngle);
  const setRecursionDepth = usePlantStore((state) => state.setRecursionDepth);
  const setRandomStrength = usePlantStore((state) => state.setRandomStrength);
  const regeneratePlant = usePlantStore((state) => state.regeneratePlant);
  const startColorTransition = usePlantStore(
    (state) => state.startColorTransition
  );

  const handleRandomColor = useCallback(() => {
    startColorTransition();
  }, [startColorTransition]);

  const handleRegenerate = useCallback(() => {
    regeneratePlant();
  }, [regeneratePlant]);

  const isAnimating = isGrowing || isPruning;

  return (
    <div className="control-panel">
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
        
        .control-panel {
          width: 280px;
          background: rgba(10, 10, 20, 0.85);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        @media (max-width: 768px) {
          .control-panel {
            width: 100%;
            border-radius: 16px 16px 0 0;
          }
          
          .controls-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .controls-grid .full-width {
            grid-column: 1 / -1;
          }
        }
      `}</style>

      <div className="mb-4">
        <h2 className="text-sm font-bold text-white mb-1 tracking-wide">
          分形植物模拟器
        </h2>
        <p className="text-[11px] text-gray-400">
          基于L系统的递归植物生长
        </p>
      </div>

      <div className="controls-grid space-y-4">
        <div className="full-width">
          <RippleSlider
            value={branchAngle}
            min={10}
            max={60}
            step={1}
            onChange={setBranchAngle}
            label="分支角度"
            unit="°"
          />
        </div>

        <div className="full-width">
          <StepperControl
            value={recursionDepth}
            min={3}
            max={8}
            onChange={setRecursionDepth}
            label="递归深度"
          />
        </div>

        <div className="full-width">
          <RippleSlider
            value={randomStrength}
            min={0}
            max={0.5}
            step={0.01}
            onChange={setRandomStrength}
            label="随机扰动强度"
            showValue={true}
          />
        </div>

        <div className="full-width space-y-2 pt-2 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <ColorPreview color={trunkColorBottom} label="主干底" />
            <ColorPreview color={trunkColorTop} label="主干顶" />
            <ColorPreview color={leafColor} label="叶子" />
          </div>

          <RippleButton
            onClick={handleRandomColor}
            disabled={isAnimating}
            className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium"
          >
            🎨 随机颜色主题
          </RippleButton>
        </div>

        <div className="full-width pt-2 border-t border-gray-700/50">
          <RippleButton
            onClick={handleRegenerate}
            disabled={isAnimating}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold"
          >
            {isGrowing ? '🌱 生长中...' : '🔄 重新生长'}
          </RippleButton>
        </div>

        <div className="full-width pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">剩余分支</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {branchCount}
            </span>
          </div>
          {isPruning && (
            <div className="mt-2 text-xs text-orange-400 text-center">
              ✂️ 修剪中...
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
          💡 拖拽旋转视角 · 滚轮缩放 · 点击分支末端修剪
        </p>
      </div>
    </div>
  );
};
