import React, { useEffect, useRef } from 'react';
import { AnimationParams, AnimationType, EasingType, PathPoint } from './types';
import { drawEasingCurve } from './utils/animationUtils';
import { parsePathData, calculatePathLength } from './utils/pathUtils';

interface AnimationControllerProps {
  animationParams: AnimationParams;
  pathPoints: PathPoint[];
  morphTargetPoints?: PathPoint[];
  onAnimationChange: (params: Partial<AnimationParams>) => void;
  onImportPath: (points: PathPoint[]) => void;
  onImportMorphTarget: (points: PathPoint[]) => void;
  onExportSVG: () => void;
  onExportConfig: () => void;
}

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear (线性)' },
  { value: 'ease', label: 'Ease (缓动)' },
  { value: 'ease-in', label: 'Ease In (渐入)' },
  { value: 'ease-out', label: 'Ease Out (渐出)' },
  { value: 'ease-in-out', label: 'Ease In Out (渐入渐出)' }
];

const ANIMATION_TYPE_OPTIONS: { value: AnimationType; label: string }[] = [
  { value: 'stroke', label: '描边动画' },
  { value: 'morph', label: '变形动画' }
];

const AnimationController: React.FC<AnimationControllerProps> = ({
  animationParams,
  pathPoints,
  morphTargetPoints,
  onAnimationChange,
  onImportPath,
  onImportMorphTarget,
  onExportSVG,
  onExportConfig
}) => {
  const [pathInput, setPathInput] = React.useState('');
  const [morphTargetInput, setMorphTargetInput] = React.useState('');
  const easingCanvasRef = useRef<HTMLCanvasElement>(null);
  const pathLength = calculatePathLength(pathPoints);
  const morphTargetLength = morphTargetPoints ? calculatePathLength(morphTargetPoints) : 0;
  const pointCountMismatch = animationParams.type === 'morph' &&
    morphTargetPoints && pathPoints.length !== morphTargetPoints.length;

  useEffect(() => {
    const canvas = easingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawEasingCurve(ctx, animationParams.easing, canvas.width, canvas.height);
  }, [animationParams.easing]);

  const handleImportPath = () => {
    if (!pathInput.trim()) return;
    const points = parsePathData(pathInput.trim());
    if (points.length > 0) {
      onImportPath(points);
    }
  };

  const handleImportMorphTarget = () => {
    if (!morphTargetInput.trim()) return;
    const points = parsePathData(morphTargetInput.trim());
    if (points.length > 0) {
      onImportMorphTarget(points);
    }
  };

  const handleTogglePlay = () => {
    onAnimationChange({
      isPlaying: !animationParams.isPlaying,
      progress: animationParams.isPlaying ? animationParams.progress : 0
    });
  };

  const handleReset = () => {
    onAnimationChange({
      isPlaying: false,
      progress: 0
    });
  };

  return (
    <div className="fade-transition">
      <h2 className="panel-title">控制面板</h2>

      <div className="form-group">
        <label className="form-label">导入 SVG Path (d属性)</label>
        <textarea
          className="textarea-input"
          rows={3}
          placeholder="例如: M 100 100 L 300 100 C 400 100 400 300 300 300"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
        />
        <div style={{ marginTop: '10px' }} className="btn-group">
          <button className="btn btn-primary btn-small btn-block" onClick={handleImportPath}>
            导入路径
          </button>
        </div>
      </div>

      <div className="path-info">
        <div className="path-info-label">路径总长度</div>
        <div className="path-info-value">{pathLength.toFixed(2)} px</div>
        <div style={{ marginTop: '8px' }} className="path-info-label">控制点数量</div>
        <div className="path-info-value">{pathPoints.length}</div>
      </div>

      <div className="form-group">
        <label className="form-label">动画控制</label>
        <div className="btn-group" style={{ marginBottom: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleTogglePlay}
            style={{ flex: 1 }}
          >
            {animationParams.isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            ⟲ 重置
          </button>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            进度
            <span className="slider-value">{Math.round(animationParams.progress * 100)}%</span>
          </label>
          <input
            type="range"
            className="slider-input"
            min="0"
            max="100"
            value={Math.round(animationParams.progress * 100)}
            onChange={(e) => onAnimationChange({
              progress: parseInt(e.target.value) / 100,
              isPlaying: false
            })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">动画类型</label>
        <select
          className="select-input"
          value={animationParams.type}
          onChange={(e) => onAnimationChange({ type: e.target.value as AnimationType })}
        >
          {ANIMATION_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {animationParams.type === 'morph' && (
        <div className="form-group">
          <label className="form-label">变形目标路径</label>
          <textarea
            className="textarea-input"
            rows={3}
            placeholder="输入目标路径的 d 属性值"
            value={morphTargetInput}
            onChange={(e) => setMorphTargetInput(e.target.value)}
          />
          <div style={{ marginTop: '10px' }}>
            <button
              className="btn btn-secondary btn-small btn-block"
              onClick={handleImportMorphTarget}
            >
              导入目标路径
            </button>
          </div>
          {pointCountMismatch && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: 'rgba(233, 69, 96, 0.15)',
              borderRadius: '6px',
              borderLeft: '3px solid #e94560',
              color: '#ff6b8a',
              fontSize: '12px'
            }}>
              ⚠️ 警告：当前路径点数量 ({pathPoints.length}) 与目标路径点数量 ({morphTargetPoints?.length || 0}) 不一致，变形动画可能无法正常工作。请确保两个路径的命令数量和类型匹配。
            </div>
          )}
          {morphTargetPoints && !pointCountMismatch && (
            <div className="path-info" style={{ marginTop: '10px' }}>
              <div className="path-info-label">目标路径长度</div>
              <div className="path-info-value">{morphTargetLength.toFixed(2)} px</div>
              <div style={{ marginTop: '4px' }} className="path-info-label">目标控制点数量</div>
              <div className="path-info-value">{morphTargetPoints.length} ✓</div>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          动画时长
          <span className="slider-value">{animationParams.duration.toFixed(1)}s</span>
        </label>
        <input
          type="range"
          className="slider-input"
          min="0.5"
          max="5"
          step="0.1"
          value={animationParams.duration}
          onChange={(e) => onAnimationChange({ duration: parseFloat(e.target.value) })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">缓动曲线</label>
        <select
          className="select-input"
          value={animationParams.easing}
          onChange={(e) => onAnimationChange({ easing: e.target.value as EasingType })}
        >
          {EASING_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="easing-preview">
          <canvas
            ref={easingCanvasRef}
            width={80}
            height={40}
            className="easing-preview-canvas"
          />
          <div>
            <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600 }}>
              {EASING_OPTIONS.find(o => o.value === animationParams.easing)?.label.split(' ')[0]}
            </div>
            <div style={{ color: '#707080', fontSize: '11px', marginTop: '2px' }}>
              预览曲线
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">导出</label>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={onExportSVG} style={{ flex: 1 }}>
            导出 SVG
          </button>
          <button className="btn btn-primary" onClick={onExportConfig} style={{ flex: 1 }}>
            导出 JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnimationController;
