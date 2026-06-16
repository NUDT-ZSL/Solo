import { Grid3X3, Heart } from 'lucide-react';
import { ControlState, Emotion, PresetConfig } from '../../utils/api';

const EMOTION_PARTICLE_DESCRIPTIONS: Record<Emotion, string> = {
  happy: '快乐：暖色粒子向外绽放',
  sad: '悲伤：冷色粒子缓缓下沉',
  angry: '愤怒：赤红粒子四散迸发',
  calm: '平静：翠绿粒子柔和漂浮',
  anxious: '焦虑：紫色粒子急促颤动',
};

interface ControlPanelProps {
  controlState: ControlState;
  presets: PresetConfig[];
  onChange: (state: Partial<ControlState>) => void;
  onSave: () => void;
  onOpenGallery: () => void;
  isSaving?: boolean;
}

export default function ControlPanel({
  controlState,
  presets,
  onChange,
  onSave,
  onOpenGallery,
  isSaving = false,
}: ControlPanelProps) {
  const emotionOptions = [
    { value: 'happy' as Emotion, label: '快乐' },
    { value: 'sad' as Emotion, label: '悲伤' },
    { value: 'angry' as Emotion, label: '愤怒' },
    { value: 'calm' as Emotion, label: '平静' },
    { value: 'anxious' as Emotion, label: '焦虑' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '16px',
        width: '280px',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          控制面板
        </span>
        <button
          onClick={onOpenGallery}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Grid3X3 size={24} color="white" />
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: '24px',
            marginBottom: '8px',
            display: 'block',
          }}
        >
          情绪选择
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={controlState.emotion}
            onChange={(e) => onChange({ emotion: e.target.value as Emotion })}
            style={{
              width: '60%',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              padding: '0 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              appearance: 'none',
              outline: 'none',
            }}
          >
            {emotionOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                style={{
                  backgroundColor: '#1f2937',
                }}
              >
                {option.label}
              </option>
            ))}
          </select>
          <p
            style={{
              width: '38%',
              fontSize: '11px',
              color: '#9ca3af',
              lineHeight: '1.4',
              paddingLeft: '8px',
              margin: 0,
            }}
          >
            {EMOTION_PARTICLE_DESCRIPTIONS[controlState.emotion]}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: '24px',
            marginBottom: '8px',
            display: 'block',
          }}
        >
          速度
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={controlState.speed}
            onChange={(e) => onChange({ speed: parseFloat(e.target.value) })}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              width: '40px',
              textAlign: 'right',
              color: 'white',
              fontSize: '14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {controlState.speed.toFixed(1)}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: '24px',
            marginBottom: '8px',
            display: 'block',
          }}
        >
          色相偏移
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={controlState.hueOffset}
            onChange={(e) => onChange({ hueOffset: parseInt(e.target.value) })}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              width: '40px',
              textAlign: 'right',
              color: 'white',
              fontSize: '14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {controlState.hueOffset}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: '24px',
            marginBottom: '8px',
            display: 'block',
          }}
        >
          复杂度
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={controlState.complexity}
            onChange={(e) => onChange({ complexity: parseInt(e.target.value) })}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              width: '40px',
              textAlign: 'right',
              color: 'white',
              fontSize: '14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {controlState.complexity}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '24px',
        }}
      >
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            border: 'none',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: isSaving ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isSaving ? '#6366f1' : '#6366f1';
          }}
          onMouseDown={(e) => {
            if (!isSaving) {
              e.currentTarget.style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Heart size={20} color="white" />
        </button>
      </div>

      <style>{`
        select option:checked {
          background-color: #6366f1 !important;
        }
        
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: #6366f1;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: #6366f1;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
        
        input[type='range']::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #6366f1, #8b5cf6);
        }
        
        @media (max-width: 768px) {
          div[style*="width: 280px"] {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
