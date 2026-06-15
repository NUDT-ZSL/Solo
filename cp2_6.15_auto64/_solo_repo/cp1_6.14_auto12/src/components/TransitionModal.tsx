import React, { useEffect, useRef } from 'react';
import { CurveType, TriggerType, StateNode } from './StateMachineEditor';

const CURVE_FUNCTIONS: Record<CurveType, (t: number) => number> = {
  EaseInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  EaseOut: (t) => 1 - Math.pow(1 - t, 3),
  Linear: (t) => t,
};

function drawCurveOnCanvas(
  canvas: HTMLCanvasElement,
  curve: CurveType,
  color: string
) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, cssH - 2);
  ctx.lineTo(cssW - 2, 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const v = CURVE_FUNCTIONS[curve](t);
    const x = 2 + t * (cssW - 4);
    const y = cssH - 2 - v * (cssH - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const CurvePreview: React.FC<{ curve: CurveType; color: string }> = ({
  curve,
  color,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawCurveOnCanvas(ref.current, curve, color);
  }, [curve, color]);
  return (
    <canvas
      ref={ref}
      style={{
        width: 80,
        height: 36,
        verticalAlign: 'middle',
        marginLeft: 8,
        borderRadius: 4,
        background: '#0f0f1a',
      }}
    />
  );
};

export interface TransitionFormData {
  triggerType: TriggerType;
  triggerValue: string;
  duration: number;
  curve: CurveType;
  midFrames: number[];
}

interface TransitionModalProps {
  visible: boolean;
  fromNode: StateNode | null;
  toNode: StateNode | null;
  form: TransitionFormData;
  onFormChange: (form: TransitionFormData) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const TransitionModal: React.FC<TransitionModalProps> = ({
  visible,
  fromNode,
  toNode,
  form,
  onFormChange,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const set = (partial: Partial<TransitionFormData>) =>
    onFormChange({ ...form, ...partial });

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          Transition: {fromNode?.name || '?'} → {toNode?.name || '?'}
        </div>

        <div className="prop-group">
          <label className="prop-label">Trigger Type</label>
          <select
            className="prop-input"
            value={form.triggerType}
            onChange={(e) =>
              set({ triggerType: e.target.value as TriggerType })
            }
          >
            <option value="KeyboardKey">KeyboardKey</option>
            <option value="Timer">Timer</option>
            <option value="AnimationEnd">AnimationEnd</option>
          </select>
        </div>

        {form.triggerType === 'KeyboardKey' && (
          <div className="prop-group">
            <label className="prop-label">Key</label>
            <select
              className="prop-input"
              value={form.triggerValue}
              onChange={(e) => set({ triggerValue: e.target.value })}
            >
              <option value="KeyW">W</option>
              <option value="KeyA">A</option>
              <option value="KeyS">S</option>
              <option value="KeyD">D</option>
              <option value="ArrowUp">↑</option>
              <option value="ArrowDown">↓</option>
              <option value="ArrowLeft">←</option>
              <option value="ArrowRight">→</option>
            </select>
          </div>
        )}

        <div className="prop-group">
          <label className="prop-label">
            Duration: {form.duration}ms
          </label>
          <input
            type="range"
            min={0}
            max={2000}
            step={10}
            value={form.duration}
            onChange={(e) => set({ duration: Number(e.target.value) })}
            className="prop-slider"
          />
        </div>

        <div className="prop-group">
          <label className="prop-label">
            Curve
            <CurvePreview curve={form.curve} color="#6366f1" />
          </label>
          <select
            className="prop-input"
            value={form.curve}
            onChange={(e) => set({ curve: e.target.value as CurveType })}
          >
            <option value="EaseInOut">EaseInOut</option>
            <option value="EaseOut">EaseOut</option>
            <option value="Linear">Linear</option>
          </select>
        </div>

        <div className="prop-group">
          <label className="prop-label">
            Mid Frames (max 3): {form.midFrames.length}
          </label>
          <div className="mid-frames">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={`mid-frame-btn ${form.midFrames.includes(i) ? 'active' : ''}`}
                onClick={() => {
                  const has = form.midFrames.includes(i);
                  set({
                    midFrames: has
                      ? form.midFrames.filter((v) => v !== i)
                      : form.midFrames.length < 3
                      ? [...form.midFrames, i]
                      : form.midFrames,
                  });
                }}
              >
                Frame {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            Create Transition
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransitionModal;
export { CurvePreview, CURVE_FUNCTIONS, drawCurveOnCanvas };
