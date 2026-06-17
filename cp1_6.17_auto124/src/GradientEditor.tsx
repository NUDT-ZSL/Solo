import { useState, useCallback } from 'react';
import { useGradientStore, PRESETS } from './store';
import { GradientType } from './types';
import { Play, Pause, Plus, Trash2, Copy, Code, FileJson } from 'lucide-react';

export default function GradientEditor() {
  const config = useGradientStore((s) => s.config);
  const setType = useGradientStore((s) => s.setType);
  const setAngle = useGradientStore((s) => s.setAngle);
  const setRadius = useGradientStore((s) => s.setRadius);
  const addColorStop = useGradientStore((s) => s.addColorStop);
  const removeColorStop = useGradientStore((s) => s.removeColorStop);
  const updateColorStop = useGradientStore((s) => s.updateColorStop);
  const setAnimationEnabled = useGradientStore((s) => s.setAnimationEnabled);
  const applyPreset = useGradientStore((s) => s.applyPreset);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }, []);

  const buildCSS = useCallback(() => {
    const sorted = [...config.colorStops].sort((a, b) => a.position - b.position);
    const stops = sorted.map((s) => `${s.color} ${(s.position * 100).toFixed(1)}%`).join(', ');
    if (config.type === 'linear') {
      return `background: linear-gradient(${config.angle}deg, ${stops});`;
    }
    return `background: radial-gradient(circle at center, ${stops});`;
  }, [config]);

  const buildJSON = useCallback(() => {
    return JSON.stringify(
      {
        type: config.type,
        ...(config.type === 'linear' ? { angle: config.angle } : { radius: config.radius }),
        colorStops: config.colorStops.map((s) => ({ color: s.color, position: s.position })),
      },
      null,
      2
    );
  }, [config]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('已复制');
      } catch {
        showToast('复制失败');
      }
    },
    [showToast]
  );

  const sortedStops = [...config.colorStops].sort((a, b) => a.position - b.position);

  return (
    <div className="editor-panel flex flex-col gap-5 overflow-y-auto p-5" style={{ height: '100%' }}>
      <h2 className="text-base font-bold tracking-wide" style={{ color: '#E94560' }}>
        渐变编辑器
      </h2>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
          渐变类型
        </label>
        <div className="flex gap-2">
          {(['linear', 'radial'] as GradientType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ease-out"
              style={{
                background: config.type === t ? '#E94560' : '#16213E',
                color: config.type === t ? '#fff' : '#8892b0',
                border: `1px solid ${config.type === t ? '#E94560' : '#0F3460'}`,
              }}
            >
              {t === 'linear' ? '线性' : '径向'}
            </button>
          ))}
        </div>
      </section>

      {config.type === 'linear' ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
              角度
            </label>
            <span className="text-xs font-mono" style={{ color: '#FFB347' }}>
              {config.angle}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={config.angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="custom-slider"
          />
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
              半径
            </label>
            <span className="text-xs font-mono" style={{ color: '#FFB347' }}>
              {config.radius}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={config.radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="custom-slider"
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
            色标
          </label>
          <button
            onClick={addColorStop}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-300 ease-out"
            style={{ background: '#16213E', color: '#FFB347', border: '1px solid #0F3460' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0F3460';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16213E';
            }}
          >
            <Plus size={12} /> 添加
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {sortedStops.map((stop) => (
            <div
              key={stop.id}
              className="flex items-center gap-2 rounded-lg p-2"
              style={{ background: '#16213E', border: '1px solid #0F3460' }}
            >
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={stop.color.startsWith('#') ? stop.color : '#ff0000'}
                  onChange={(e) => updateColorStop(stop.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ width: 28, height: 28 }}
                />
                <div
                  className="rounded-full border-2"
                  style={{
                    width: 28,
                    height: 28,
                    background: stop.color,
                    borderColor: '#0F3460',
                    flexShrink: 0,
                  }}
                />
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(stop.position * 100)}
                onChange={(e) =>
                  updateColorStop(stop.id, { position: Number(e.target.value) / 100 })
                }
                className="custom-slider flex-1"
              />
              <span className="text-xs font-mono w-10 text-right" style={{ color: '#8892b0' }}>
                {Math.round(stop.position * 100)}%
              </span>
              <button
                onClick={() => removeColorStop(stop.id)}
                className="rounded p-1 transition-all duration-300 ease-out"
                style={{ color: '#8892b0' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#E94560';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8892b0';
                }}
                disabled={config.colorStops.length <= 2}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
          预设色板
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const sorted = [...preset.config.colorStops].sort(
              (a, b) => a.position - b.position
            );
            const stops = sorted
              .map((s) => `${s.color} ${(s.position * 100).toFixed(0)}%`)
              .join(', ');
            const bg =
              preset.config.type === 'linear'
                ? `linear-gradient(${preset.config.angle}deg, ${stops})`
                : `radial-gradient(circle at center, ${stops})`;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center gap-1 rounded-lg p-2 transition-all duration-300 ease-out"
                style={{ background: '#16213E', border: '1px solid #0F3460' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E94560';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#0F3460';
                }}
              >
                <div
                  className="rounded"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 4,
                    background: bg,
                  }}
                />
                <span className="text-xs" style={{ color: '#8892b0' }}>
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
          动画
        </label>
        <button
          onClick={() => setAnimationEnabled(!config.animationEnabled)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ease-out"
          style={{
            background: config.animationEnabled ? '#E94560' : '#16213E',
            color: config.animationEnabled ? '#fff' : '#8892b0',
            border: `1px solid ${config.animationEnabled ? '#E94560' : '#0F3460'}`,
          }}
        >
          {config.animationEnabled ? <Pause size={14} /> : <Play size={14} />}
          {config.animationEnabled ? '暂停动画' : '播放动画'}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: '#8892b0' }}>
          导出
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleCopy(buildCSS())}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ease-out"
            style={{ background: '#16213E', color: '#FFB347', border: '1px solid #0F3460' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0F3460';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16213E';
            }}
          >
            <Code size={14} /> CSS
          </button>
          <button
            onClick={() => handleCopy(buildJSON())}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ease-out"
            style={{ background: '#16213E', color: '#FFB347', border: '1px solid #0F3460' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0F3460';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16213E';
            }}
          >
            <FileJson size={14} /> JSON
          </button>
        </div>
      </section>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg px-5 py-2 text-sm font-semibold shadow-lg"
          style={{
            background: '#E94560',
            color: '#fff',
            zIndex: 9999,
            animation: 'toastIn 0.3s ease-out',
          }}
        >
          <Copy size={14} className="inline mr-1" />
          {toast}
        </div>
      )}
    </div>
  );
}
